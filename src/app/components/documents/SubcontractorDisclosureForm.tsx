"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { fetchContacts, generateNextDocNo } from "../../lib/documents/hooks";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import type { SubcontractorDisclosurePayload } from "../../lib/documents/types";
import type { AgencyDocument, Contact } from "../../lib/types";
import { buildContactAddress, formatDateInputInMalaysia, getDateOnlyFromStorage, getErrorMessage, isValidDateOnly } from "../../lib/utils";
import ContactSelect from "./ContactSelect";

const META = getDocumentTypeMeta("subcontractor_disclosure")!;

type Mode = "create" | "edit";

const defaultPayload = (): SubcontractorDisclosurePayload => ({
  campaign_name: "",
  agreement_reference: "",
  clause_reference: "",
  client_reg_no: "",
  vendor_name: "",
  vendor_trading_as: "",
  vendor_registration_no: "",
  vendor_registration_date: "",
  vendor_registered_state: "Malaysia",
  scope_of_engagement: "",
  liability_confirmation: [
    "The sub-contractor is an independent contractor with no ownership, control, or affiliation relationship with Omnyzo Agency.",
    "Omnyzo Agency remains fully and primarily liable for the performance of all Services under the Agreement, including any work performed by the sub-contractor.",
  ],
  agency_signatory_name: "Muhammad Faiz Ikmal Bin Shamsul Afizi",
  agency_signatory_title: "Founder & Principal",
});

export default function SubcontractorDisclosureForm({ mode, documentId }: { mode: Mode; documentId?: string }) {
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
  const [payload, setPayload] = useState<SubcontractorDisclosurePayload>(defaultPayload());
  const [liabilityText, setLiabilityText] = useState(defaultPayload().liability_confirmation.join("\n"));
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
      setPayload((prev) => ({ ...prev, client_reg_no: contact.ssm_no || contact.tin_no || prev.client_reg_no }));
    }
  };

  const populateFromDocument = (doc: AgencyDocument, contactList: Contact[], asDuplicate: boolean) => {
    const p = { ...defaultPayload(), ...(doc.payload as Partial<SubcontractorDisclosurePayload>) };
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
    setLiabilityText(p.liability_confirmation.join("\n"));
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
          toast.error("Could not load this disclosure form.");
          setIsInitialLoading(false);
          return;
        }
        populateFromDocument(data as AgencyDocument, contactList, false);
      } else if (duplicateId) {
        const { data, error } = await supabase.from("documents").select("*").eq("id", duplicateId).single();
        if (error || !data) {
          toast.error("Could not load the disclosure form to duplicate. Starting blank instead.");
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
      setDocNo(await generateNextDocNo("subcontractor_disclosure", META.prefixCode, issueDate));
    };
    void generate();
  }, [issueDate, isEditMode]);

  const validateStep1 = () => {
    if (!counterparty.name.trim()) { toast.error("Client name is required."); return false; }
    if (!docNo || docNo === "Generating...") { toast.error("Please wait for the document number to generate."); return false; }
    if (!isValidDateOnly(issueDate)) { toast.error("Issue date must be a valid date."); return false; }
    if (!payload.vendor_name.trim()) { toast.error("Sub-contractor registered name is required."); return false; }
    return true;
  };

  const nextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    const liability = liabilityText.split("\n").map((v) => v.trim()).filter(Boolean);
    if (!payload.scope_of_engagement.trim()) {
      toast.error("Scope of engagement is required.");
      return;
    }
    if (liability.length === 0) {
      toast.error("At least one liability confirmation statement is required.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(isEditMode ? "Saving disclosure form..." : "Creating disclosure form...");

    const finalPayload: SubcontractorDisclosurePayload = { ...payload, liability_confirmation: liability };

    const row = {
      document_type: "subcontractor_disclosure" as const,
      doc_no: docNo,
      title: title || `Sub-contractor Disclosure - ${payload.vendor_name}`,
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
      notes: notes || null,
      terms: terms || null,
    };

    try {
      if (isEditMode) {
        const { error } = await supabase.from("documents").update(row).eq("id", documentId);
        if (error) throw error;
        toast.success("Disclosure form updated.", { id: loadingToast });
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

        toast.success(`Disclosure form ${row.doc_no} created.`, { id: loadingToast });
        router.push(`/documents/${data.id}`);
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading disclosure form editor...</div>;
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
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{isEditMode ? "Edit Disclosure Form" : "New Sub-contractor Disclosure"}</h1>
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Client &amp; Sub-contractor Details</h2>

              <ContactSelect contacts={contacts} contactType="Customer" selectedContactId={selectedContactId} onSelect={handleContactSelect} label="Select Client" />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input className={inputClass} value={counterparty.name} onChange={(e) => setCounterparty({ ...counterparty, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Client Registration No.</label>
                  <input className={inputClass} value={payload.client_reg_no} onChange={(e) => setPayload({ ...payload, client_reg_no: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Disclosure Date *</label>
                  <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Disclosure No.</label>
                  <input className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-[#151515]`} value={docNo} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Campaign / Project Name</label>
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
                <div>
                  <label className={labelClass}>Agreement Reference</label>
                  <input className={inputClass} value={payload.agreement_reference} onChange={(e) => setPayload({ ...payload, agreement_reference: e.target.value })} placeholder="e.g. related Service Agreement No." />
                </div>
                <div>
                  <label className={labelClass}>Clause Reference</label>
                  <input className={inputClass} value={payload.clause_reference} onChange={(e) => setPayload({ ...payload, clause_reference: e.target.value })} placeholder="e.g. Clause 12.2" />
                </div>
              </div>

              <h2 className="border-b border-gray-100 pb-4 pt-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Sub-contractor Registration</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Registered Name *</label>
                  <input className={inputClass} value={payload.vendor_name} onChange={(e) => setPayload({ ...payload, vendor_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Trading As</label>
                  <input className={inputClass} value={payload.vendor_trading_as} onChange={(e) => setPayload({ ...payload, vendor_trading_as: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>SSM Registration No.</label>
                  <input className={inputClass} value={payload.vendor_registration_no} onChange={(e) => setPayload({ ...payload, vendor_registration_no: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Date of Registration</label>
                  <input type="date" className={inputClass} value={payload.vendor_registration_date} onChange={(e) => setPayload({ ...payload, vendor_registration_date: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Registered State</label>
                  <input className={inputClass} value={payload.vendor_registered_state} onChange={(e) => setPayload({ ...payload, vendor_registered_state: e.target.value })} />
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Scope, Liability &amp; Approval</h2>

              <div>
                <label className={labelClass}>Scope of Engagement *</label>
                <textarea rows={4} className={inputClass} value={payload.scope_of_engagement} onChange={(e) => setPayload({ ...payload, scope_of_engagement: e.target.value })} placeholder="Describe what the sub-contractor is engaged to do, and any limits on their role." />
              </div>

              <div>
                <label className={labelClass}>Relationship &amp; Liability Confirmation (one statement per line) *</label>
                <textarea rows={4} className={inputClass} value={liabilityText} onChange={(e) => setLiabilityText(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Omnyzo Signatory Name</label>
                  <input className={inputClass} value={payload.agency_signatory_name} onChange={(e) => setPayload({ ...payload, agency_signatory_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Omnyzo Signatory Title</label>
                  <input className={inputClass} value={payload.agency_signatory_title} onChange={(e) => setPayload({ ...payload, agency_signatory_title: e.target.value })} />
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
                  {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Disclosure Form"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
