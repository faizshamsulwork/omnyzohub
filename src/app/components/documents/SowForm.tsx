"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { fetchContacts, generateNextDocNo } from "../../lib/documents/hooks";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import type { DeliverableItem, SowPayload } from "../../lib/documents/types";
import type { AgencyDocument, Contact, LineItem } from "../../lib/types";
import { buildContactAddress, formatDateInputInMalaysia, getDateOnlyFromStorage, getErrorMessage, isValidDateOnly, toNumber } from "../../lib/utils";
import ContactSelect from "./ContactSelect";

const META = getDocumentTypeMeta("sow")!;

type Mode = "create" | "edit";
type FeeRow = { id: number; description: string; amount: string };
type RosterRow = { name: string; role: string };
type TargetRow = { metric: string; target: string };

const emptyDeliverable = (): DeliverableItem => ({ format: "", quantity: "1", due_date: "" });
const emptyFeeRow = (): FeeRow => ({ id: Date.now() + Math.random(), description: "", amount: "0" });
const emptyRosterRow = (): RosterRow => ({ name: "", role: "" });
const emptyTargetRow = (): TargetRow => ({ metric: "", target: "" });

const defaultPayload = (): SowPayload => ({
  campaign_name: "",
  objectives: "",
  creator_roster: [emptyRosterRow()],
  deliverables: [emptyDeliverable()],
  performance_targets: [emptyTargetRow()],
});

export default function SowForm({ mode, documentId }: { mode: Mode; documentId?: string }) {
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
  const [payload, setPayload] = useState<SowPayload>(defaultPayload());
  const [feeRows, setFeeRows] = useState<FeeRow[]>([emptyFeeRow()]);
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
    }
  };

  const populateFromDocument = (doc: AgencyDocument, contactList: Contact[], asDuplicate: boolean) => {
    const p = { ...defaultPayload(), ...(doc.payload as Partial<SowPayload>) };
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
    if (doc.line_items && doc.line_items.length > 0) {
      setFeeRows(doc.line_items.map((item) => ({ id: item.id, description: item.description, amount: String(item.price) })));
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
          toast.error("Could not load this SOW.");
          setIsInitialLoading(false);
          return;
        }
        populateFromDocument(data as AgencyDocument, contactList, false);
      } else if (duplicateId) {
        const { data, error } = await supabase.from("documents").select("*").eq("id", duplicateId).single();
        if (error || !data) {
          toast.error("Could not load the SOW to duplicate. Starting blank instead.");
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
      setDocNo(await generateNextDocNo("sow", META.prefixCode, issueDate));
    };
    void generate();
  }, [issueDate, isEditMode]);

  const updateDeliverable = (index: number, field: keyof DeliverableItem, value: string) => {
    setPayload((prev) => {
      const deliverables = [...prev.deliverables];
      deliverables[index] = { ...deliverables[index], [field]: value };
      return { ...prev, deliverables };
    });
  };
  const addDeliverable = () => setPayload((prev) => ({ ...prev, deliverables: [...prev.deliverables, emptyDeliverable()] }));
  const removeDeliverable = (index: number) => setPayload((prev) => ({ ...prev, deliverables: prev.deliverables.filter((_, i) => i !== index) }));

  const updateRoster = (index: number, field: keyof RosterRow, value: string) => {
    setPayload((prev) => {
      const creator_roster = [...prev.creator_roster];
      creator_roster[index] = { ...creator_roster[index], [field]: value };
      return { ...prev, creator_roster };
    });
  };
  const addRoster = () => setPayload((prev) => ({ ...prev, creator_roster: [...prev.creator_roster, emptyRosterRow()] }));
  const removeRoster = (index: number) => setPayload((prev) => ({ ...prev, creator_roster: prev.creator_roster.filter((_, i) => i !== index) }));

  const updateTarget = (index: number, field: keyof TargetRow, value: string) => {
    setPayload((prev) => {
      const performance_targets = [...prev.performance_targets];
      performance_targets[index] = { ...performance_targets[index], [field]: value };
      return { ...prev, performance_targets };
    });
  };
  const addTarget = () => setPayload((prev) => ({ ...prev, performance_targets: [...prev.performance_targets, emptyTargetRow()] }));
  const removeTarget = (index: number) => setPayload((prev) => ({ ...prev, performance_targets: prev.performance_targets.filter((_, i) => i !== index) }));

  const updateFeeRow = (index: number, field: keyof FeeRow, value: string) => {
    setFeeRows((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value } as FeeRow;
      return next;
    });
  };
  const addFeeRow = () => setFeeRows((rows) => [...rows, emptyFeeRow()]);
  const removeFeeRow = (index: number) => setFeeRows((rows) => rows.filter((_, i) => i !== index));
  const totalFee = feeRows.reduce((sum, row) => sum + toNumber(row.amount), 0);

  const validateStep1 = () => {
    if (!counterparty.name.trim()) { toast.error("Client name is required."); return false; }
    if (!docNo || docNo === "Generating...") { toast.error("Please wait for the document number to generate."); return false; }
    if (!isValidDateOnly(issueDate)) { toast.error("Issue date must be a valid date."); return false; }
    if (!payload.campaign_name.trim()) { toast.error("Campaign name is required."); return false; }
    return true;
  };

  const nextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!payload.deliverables.some((d) => d.format.trim())) {
      toast.error("At least one deliverable is required.");
      return;
    }
    if (!feeRows.some((row) => row.description.trim() && toNumber(row.amount) > 0)) {
      toast.error("At least one fee line with an amount greater than 0 is required.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(isEditMode ? "Saving SOW..." : "Creating SOW...");

    const lineItems: LineItem[] = feeRows
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

    const finalPayload: SowPayload = {
      ...payload,
      creator_roster: payload.creator_roster.filter((r) => r.name.trim()),
      performance_targets: payload.performance_targets.filter((t) => t.metric.trim()),
    };

    const row = {
      document_type: "sow" as const,
      doc_no: docNo,
      title: title || `SOW - ${payload.campaign_name}`,
      status,
      counterparty_contact_id: selectedContactId || null,
      counterparty_name: counterparty.name,
      counterparty_pic: counterparty.pic || null,
      counterparty_email: counterparty.email || null,
      counterparty_phone: counterparty.phone || null,
      counterparty_address: counterparty.address || null,
      issue_date: issueDate,
      valid_until: null,
      payload: finalPayload,
      line_items: lineItems,
      notes: notes || null,
      terms: terms || null,
    };

    try {
      if (isEditMode) {
        const { error } = await supabase.from("documents").update(row).eq("id", documentId);
        if (error) throw error;
        toast.success("SOW updated.", { id: loadingToast });
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

        toast.success(`SOW ${row.doc_no} created.`, { id: loadingToast });
        router.push(`/documents/${data.id}`);
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading SOW editor...</div>;
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
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{isEditMode ? "Edit SOW" : "New Statement of Work"}</h1>
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Client &amp; Campaign Details</h2>

              <ContactSelect contacts={contacts} contactType="Customer" selectedContactId={selectedContactId} onSelect={handleContactSelect} label="Select Client" />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input className={inputClass} value={counterparty.name} onChange={(e) => setCounterparty({ ...counterparty, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Attention / PIC</label>
                  <input className={inputClass} value={counterparty.pic} onChange={(e) => setCounterparty({ ...counterparty, pic: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>SOW Date *</label>
                  <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>SOW No.</label>
                  <input className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-[#151515]`} value={docNo} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Campaign Name *</label>
                  <input className={inputClass} value={payload.campaign_name} onChange={(e) => setPayload({ ...payload, campaign_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Objectives</label>
                <textarea rows={3} className={inputClass} value={payload.objectives} onChange={(e) => setPayload({ ...payload, objectives: e.target.value })} placeholder="What this campaign is meant to achieve." />
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Roster, Deliverables &amp; Fees</h2>

              <div className="space-y-3">
                <label className={labelClass}>Creator Roster</label>
                {payload.creator_roster.map((rosterRow, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0A0A0A] md:grid-cols-[1fr_1fr_40px]">
                    <input className={inputClass} placeholder="Creator name" value={rosterRow.name} onChange={(e) => updateRoster(index, "name", e.target.value)} />
                    <input className={inputClass} placeholder="Role (e.g. Lead Creator)" value={rosterRow.role} onChange={(e) => updateRoster(index, "role", e.target.value)} />
                    <button type="button" onClick={() => removeRoster(index)} disabled={payload.creator_roster.length <= 1} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20">
                      <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addRoster} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add creator</button>
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Deliverables *</label>
                {payload.deliverables.map((deliverable, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0A0A0A] md:grid-cols-[1fr_100px_160px_40px]">
                    <input className={inputClass} placeholder="Format (e.g. 4x Instagram Reels)" value={deliverable.format} onChange={(e) => updateDeliverable(index, "format", e.target.value)} />
                    <input className={inputClass} placeholder="Qty" value={deliverable.quantity} onChange={(e) => updateDeliverable(index, "quantity", e.target.value)} />
                    <input type="date" className={inputClass} value={deliverable.due_date} onChange={(e) => updateDeliverable(index, "due_date", e.target.value)} />
                    <button type="button" onClick={() => removeDeliverable(index)} disabled={payload.deliverables.length <= 1} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20">
                      <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addDeliverable} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add deliverable</button>
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Performance Targets</label>
                {payload.performance_targets.map((targetRow, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0A0A0A] md:grid-cols-[1fr_1fr_40px]">
                    <input className={inputClass} placeholder="Metric (e.g. Reach)" value={targetRow.metric} onChange={(e) => updateTarget(index, "metric", e.target.value)} />
                    <input className={inputClass} placeholder="Target (e.g. 500,000)" value={targetRow.target} onChange={(e) => updateTarget(index, "target", e.target.value)} />
                    <button type="button" onClick={() => removeTarget(index)} disabled={payload.performance_targets.length <= 1} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20">
                      <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addTarget} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add target</button>
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Fee Breakdown *</label>
                {feeRows.map((feeRow, index) => (
                  <div key={feeRow.id} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0A0A0A] md:grid-cols-[1fr_140px_40px]">
                    <input className={inputClass} placeholder="Description (e.g. Campaign Fee)" value={feeRow.description} onChange={(e) => updateFeeRow(index, "description", e.target.value)} />
                    <input className={inputClass} placeholder="Amount (RM)" value={feeRow.amount} onChange={(e) => updateFeeRow(index, "amount", e.target.value)} />
                    <button type="button" onClick={() => removeFeeRow(index)} disabled={feeRows.length <= 1} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20">
                      <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addFeeRow} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add fee line</button>
                <p className="text-right text-sm font-black text-gray-900 dark:text-white">Total: RM {totalFee.toFixed(2)}</p>
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
                  {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create SOW"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
