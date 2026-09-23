"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { fetchContacts, generateNextDocNo } from "../../lib/documents/hooks";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import type { ServiceAgreementPayload } from "../../lib/documents/types";
import type { AgencyDocument, Contact, LineItem } from "../../lib/types";
import { addDaysToDateInput, buildContactAddress, formatDateInputInMalaysia, getDateOnlyFromStorage, getErrorMessage, isValidDateOnly, toNumber } from "../../lib/utils";
import ContactSelect from "./ContactSelect";

const META = getDocumentTypeMeta("service_agreement")!;

type Mode = "create" | "edit";
type MilestoneRow = { id: number; description: string; amount: string };

const emptyMilestone = (): MilestoneRow => ({ id: Date.now() + Math.random(), description: "", amount: "0" });

const defaultPayload = (): ServiceAgreementPayload => ({
  client_legal_name: "",
  client_reg_no: "",
  engagement_term_start: formatDateInputInMalaysia(),
  engagement_term_end: addDaysToDateInput(formatDateInputInMalaysia(), 365),
  scope_of_services: [],
  fee_structure: "",
  renewal_clause: "",
  termination_clause: "",
  confidentiality_clause_ref: "",
  governing_law: "Malaysia",
});

export default function ServiceAgreementForm({ mode, documentId }: { mode: Mode; documentId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === "edit";
  const duplicateId = searchParams.get("duplicate");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [docNo, setDocNo] = useState("Generating...");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [issueDate, setIssueDate] = useState(formatDateInputInMalaysia());
  const [counterparty, setCounterparty] = useState({ name: "", pic: "", phone: "", email: "", address: "" });
  const [payload, setPayload] = useState<ServiceAgreementPayload>(defaultPayload());
  const [scopeText, setScopeText] = useState("");
  const [milestoneRows, setMilestoneRows] = useState<MilestoneRow[]>([emptyMilestone()]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [duplicateSourceNo, setDuplicateSourceNo] = useState<string | null>(null);

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      setCounterparty({
        name: contact.name,
        pic: contact.pic_name || "",
        phone: contact.phone || "",
        email: contact.email || "",
        address: buildContactAddress(contact),
      });
      setPayload((prev) => ({ ...prev, client_legal_name: contact.name, client_reg_no: contact.ssm_no || contact.tin_no || prev.client_reg_no }));
    }
  };

  const populateFromDocument = (doc: AgencyDocument, contactList: Contact[], asDuplicate: boolean) => {
    const p = { ...defaultPayload(), ...(doc.payload as Partial<ServiceAgreementPayload>) };
    if (!asDuplicate) {
      setDocNo(doc.doc_no);
      setTitle(doc.title || "");
      setStatus(doc.status || "draft");
      setIssueDate(getDateOnlyFromStorage(doc.issue_date) || formatDateInputInMalaysia());
    }
    setCounterparty({
      name: doc.counterparty_name || "",
      pic: doc.counterparty_pic || "",
      phone: doc.counterparty_phone || "",
      email: doc.counterparty_email || "",
      address: doc.counterparty_address || "",
    });
    const matchedContact = contactList.find((c) => c.name === doc.counterparty_name && (!doc.counterparty_email || c.email === doc.counterparty_email));
    setSelectedContactId(matchedContact?.id || doc.counterparty_contact_id || "");
    setPayload(p);
    setScopeText(p.scope_of_services.join("\n"));
    if (doc.line_items && doc.line_items.length > 0) {
      setMilestoneRows(doc.line_items.map((item) => ({ id: item.id, description: item.description, amount: String(item.price) })));
    }
    setNotes(doc.notes || "");
    setTerms(doc.terms || "");
    if (asDuplicate) setDuplicateSourceNo(doc.doc_no);
  };

  useEffect(() => {
    const load = async () => {
      setIsInitialLoading(true);
      const contactList = await fetchContacts().catch(() => []);
      setContacts(contactList);

      if (isEditMode) {
        if (!documentId) { setIsInitialLoading(false); return; }
        const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).single();
        if (error || !data) {
          toast.error("Could not load this agreement.");
          setIsInitialLoading(false);
          return;
        }
        populateFromDocument(data as AgencyDocument, contactList, false);
      } else if (duplicateId) {
        const { data, error } = await supabase.from("documents").select("*").eq("id", duplicateId).single();
        if (error || !data) {
          toast.error("Could not load the agreement to duplicate. Starting blank instead.");
        } else {
          populateFromDocument(data as AgencyDocument, contactList, true);
        }
      }

      setIsInitialLoading(false);
    };
    void load();
  }, [documentId, duplicateId, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    if (!issueDate) return;
    const generate = async () => {
      setDocNo("Generating...");
      setDocNo(await generateNextDocNo("service_agreement", META.prefixCode, issueDate));
    };
    void generate();
  }, [issueDate, isEditMode]);

  const updateMilestone = (index: number, field: keyof MilestoneRow, value: string) => {
    setMilestoneRows((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value } as MilestoneRow;
      return next;
    });
  };
  const addMilestone = () => setMilestoneRows((rows) => [...rows, emptyMilestone()]);
  const removeMilestone = (index: number) => setMilestoneRows((rows) => rows.filter((_, i) => i !== index));
  const totalFee = milestoneRows.reduce((sum, row) => sum + toNumber(row.amount), 0);

  const validateStep1 = () => {
    if (!counterparty.name.trim()) { toast.error("Client legal name is required."); return false; }
    if (!docNo || docNo === "Generating...") { toast.error("Please wait for the document number to generate."); return false; }
    if (!isValidDateOnly(issueDate)) { toast.error("Issue date must be a valid date."); return false; }
    if (!isValidDateOnly(payload.engagement_term_start) || !isValidDateOnly(payload.engagement_term_end)) {
      toast.error("Engagement term start/end must be valid dates.");
      return false;
    }
    if (payload.engagement_term_end < payload.engagement_term_start) {
      toast.error("Engagement term end date cannot be before the start date.");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    const scope = scopeText.split("\n").map((v) => v.trim()).filter(Boolean);
    if (scope.length === 0) {
      toast.error("At least one scope-of-services line is required.");
      return;
    }
    if (!milestoneRows.some((row) => row.description.trim() && toNumber(row.amount) > 0)) {
      toast.error("At least one fee/milestone line with an amount greater than 0 is required.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(isEditMode ? "Saving agreement..." : "Creating agreement...");

    const lineItems: LineItem[] = milestoneRows
      .filter((row) => row.description.trim())
      .map((row) => ({
        id: typeof row.id === "number" ? row.id : Date.now(),
        type: "item",
        description: row.description,
        qty: 1,
        price: toNumber(row.amount),
        taxRate: 0,
        total: toNumber(row.amount),
      }));

    const finalPayload: ServiceAgreementPayload = { ...payload, scope_of_services: scope, client_legal_name: counterparty.name };

    const row = {
      document_type: "service_agreement" as const,
      doc_no: docNo,
      title: title || `Service Agreement - ${counterparty.name}`,
      status,
      counterparty_contact_id: selectedContactId || null,
      counterparty_name: counterparty.name,
      counterparty_pic: counterparty.pic || null,
      counterparty_email: counterparty.email || null,
      counterparty_phone: counterparty.phone || null,
      counterparty_address: counterparty.address || null,
      issue_date: issueDate,
      valid_until: finalPayload.engagement_term_end || null,
      payload: finalPayload,
      line_items: lineItems,
      notes: notes || null,
      terms: terms || null,
    };

    try {
      if (isEditMode) {
        const { error } = await supabase.from("documents").update(row).eq("id", documentId);
        if (error) throw error;
        toast.success("Agreement updated.", { id: loadingToast });
        router.push(`/documents/${documentId}`);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from("documents")
          .insert([{ ...row, created_by: session?.user?.email || null }])
          .select("id")
          .single();
        if (error) throw error;

        await supabase.from("audit_logs").insert([{
          action: "CREATE_DOCUMENT",
          details: `Created ${row.doc_no} (${META.label}, Counterparty: ${row.counterparty_name})`,
          performed_by: session?.user?.email || "unknown",
        }]);

        toast.success(`Agreement ${row.doc_no} created.`, { id: loadingToast });
        router.push(`/documents/${data.id}`);
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading agreement editor...</div>;
  }

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white";
  const labelClass = "mb-2 block text-sm font-medium text-gray-500";

  return (
    <div className="min-h-screen p-8 md:p-12 relative z-10 transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button type="button" onClick={() => router.push("/documents")} className="mb-2 inline-flex text-sm font-medium text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
              &larr; Back to Documents
            </button>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{isEditMode ? "Edit Service Agreement" : "New Service Agreement"}</h1>
            {!isEditMode && duplicateSourceNo && (
              <p className="mt-2 text-sm font-bold text-gray-500">Duplicated from {duplicateSourceNo}. Review before saving.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[1, 2].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step === num ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : step > num ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-black" : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"}`}>{step > num ? "✓" : num}</div>
                {num < 2 && <div className={`h-1 w-10 rounded-full ${step > num ? "bg-gray-800 dark:bg-gray-200" : "bg-gray-200 dark:bg-gray-800"}`} />}
              </div>
            ))}
          </div>
        </header>

        <div className="rounded-[32px] border border-gray-200 bg-white/90 p-8 shadow-2xl backdrop-blur-xl transition-colors duration-500 dark:border-gray-800 dark:bg-[#111111]/90 md:p-10">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Client &amp; Term Details</h2>

              <ContactSelect contacts={contacts} contactType="Customer" selectedContactId={selectedContactId} onSelect={handleContactSelect} label="Select Client" />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Client Legal Name *</label>
                  <input className={inputClass} value={counterparty.name} onChange={(e) => setCounterparty({ ...counterparty, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Client Registration No.</label>
                  <input className={inputClass} value={payload.client_reg_no} onChange={(e) => setPayload({ ...payload, client_reg_no: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Attention / PIC</label>
                  <input className={inputClass} value={counterparty.pic} onChange={(e) => setCounterparty({ ...counterparty, pic: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} value={counterparty.email} onChange={(e) => setCounterparty({ ...counterparty, email: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Agreement Date *</label>
                  <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Agreement No.</label>
                  <input className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-[#151515]`} value={docNo} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Term Start *</label>
                  <input type="date" className={inputClass} value={payload.engagement_term_start} onChange={(e) => setPayload({ ...payload, engagement_term_start: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Term End *</label>
                  <input type="date" className={inputClass} value={payload.engagement_term_end} onChange={(e) => setPayload({ ...payload, engagement_term_end: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="signed">Signed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={nextStep} className="rounded-full bg-blue-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95">
                  Continue &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Scope, Fees &amp; Terms</h2>

              <div>
                <label className={labelClass}>Scope of Services (one per line) *</label>
                <textarea rows={4} className={inputClass} value={scopeText} onChange={(e) => setScopeText(e.target.value)} placeholder={"Social media strategy & content calendar\nInfluencer campaign management\nMonthly performance reporting"} />
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Fee Structure / Payment Milestones *</label>
                {milestoneRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0A0A0A] md:grid-cols-[1fr_140px_40px]">
                    <input className={inputClass} placeholder="Description (e.g. Monthly Retainer)" value={row.description} onChange={(e) => updateMilestone(index, "description", e.target.value)} />
                    <input className={inputClass} placeholder="Amount (RM)" value={row.amount} onChange={(e) => updateMilestone(index, "amount", e.target.value)} />
                    <button type="button" onClick={() => removeMilestone(index)} disabled={milestoneRows.length <= 1} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20">
                      <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addMilestone} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add fee line</button>
                <p className="text-right text-sm font-black text-gray-900 dark:text-white">Total: RM {totalFee.toFixed(2)}</p>
              </div>

              <div>
                <label className={labelClass}>Fee Structure Note</label>
                <input className={inputClass} value={payload.fee_structure} onChange={(e) => setPayload({ ...payload, fee_structure: e.target.value })} placeholder="e.g. Monthly retainer, billed in advance" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Renewal Clause</label>
                  <input className={inputClass} value={payload.renewal_clause} onChange={(e) => setPayload({ ...payload, renewal_clause: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Termination Clause</label>
                  <input className={inputClass} value={payload.termination_clause} onChange={(e) => setPayload({ ...payload, termination_clause: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Confidentiality Reference</label>
                  <input className={inputClass} value={payload.confidentiality_clause_ref} onChange={(e) => setPayload({ ...payload, confidentiality_clause_ref: e.target.value })} placeholder="e.g. per separate NDA dated..." />
                </div>
                <div>
                  <label className={labelClass}>Governing Law</label>
                  <input className={inputClass} value={payload.governing_law} onChange={(e) => setPayload({ ...payload, governing_law: e.target.value })} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea rows={3} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Terms</label>
                <textarea rows={3} className={inputClass} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="rounded-full bg-gray-100 px-8 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">
                  &larr; Back
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading} className="rounded-full bg-blue-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50">
                  {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Agreement"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
