"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { COMPANY_PROFILE } from "../../lib/company";
import { fetchContacts, generateNextDocNo } from "../../lib/documents/hooks";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import type { NdaPayload } from "../../lib/documents/types";
import type { AgencyDocument, Contact } from "../../lib/types";
import { buildContactAddress, formatDateInputInMalaysia, getDateOnlyFromStorage, getErrorMessage, isValidDateOnly } from "../../lib/utils";
import ContactSelect from "./ContactSelect";

const META = getDocumentTypeMeta("nda")!;

type Mode = "create" | "edit";
type PartyType = "Customer" | "Freelancer";

const defaultPayload = (): NdaPayload => ({
  disclosing_party: COMPANY_PROFILE.legalName,
  receiving_party: "",
  mutual: true,
  purpose: "",
  confidential_info_definition: "",
  term_years: "2",
  governing_law: "Malaysia",
});

export default function NdaForm({ mode, documentId }: { mode: Mode; documentId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === "edit";
  const duplicateId = searchParams.get("duplicate");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [partyType, setPartyType] = useState<PartyType>("Customer");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [docNo, setDocNo] = useState("Generating...");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [issueDate, setIssueDate] = useState(formatDateInputInMalaysia());
  const [counterparty, setCounterparty] = useState({ name: "", pic: "", phone: "", email: "", address: "" });
  const [payload, setPayload] = useState<NdaPayload>(defaultPayload());
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
      setPayload((prev) => ({ ...prev, receiving_party: prev.receiving_party || contact.name }));
    }
  };

  const handlePartyTypeChange = (nextType: PartyType) => {
    setPartyType(nextType);
    setSelectedContactId("");
    setCounterparty({ name: "", pic: "", phone: "", email: "", address: "" });
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
          toast.error("Could not load this NDA.");
          setIsInitialLoading(false);
          return;
        }
        const doc = data as AgencyDocument;
        const p = { ...defaultPayload(), ...(doc.payload as Partial<NdaPayload>) };
        setDocNo(doc.doc_no);
        setTitle(doc.title || "");
        setStatus(doc.status || "draft");
        setIssueDate(getDateOnlyFromStorage(doc.issue_date) || formatDateInputInMalaysia());
        setCounterparty({
          name: doc.counterparty_name || "",
          pic: doc.counterparty_pic || "",
          phone: doc.counterparty_phone || "",
          email: doc.counterparty_email || "",
          address: doc.counterparty_address || "",
        });
        const matchedContact = contactList.find((c) => c.name === doc.counterparty_name && (!doc.counterparty_email || c.email === doc.counterparty_email));
        setSelectedContactId(matchedContact?.id || doc.counterparty_contact_id || "");
        if (matchedContact?.contact_type === "Freelancer") setPartyType("Freelancer");
        setPayload(p);
        setNotes(doc.notes || "");
        setTerms(doc.terms || "");
      } else if (duplicateId) {
        const { data, error } = await supabase.from("documents").select("*").eq("id", duplicateId).single();
        if (error || !data) {
          toast.error("Could not load the NDA to duplicate. Starting blank instead.");
        } else {
          const doc = data as AgencyDocument;
          const p = { ...defaultPayload(), ...(doc.payload as Partial<NdaPayload>) };
          const matchedContact = contactList.find((c) => c.name === doc.counterparty_name && (!doc.counterparty_email || c.email === doc.counterparty_email));
          setCounterparty({
            name: doc.counterparty_name || "",
            pic: doc.counterparty_pic || "",
            phone: doc.counterparty_phone || "",
            email: doc.counterparty_email || "",
            address: doc.counterparty_address || "",
          });
          setSelectedContactId(matchedContact?.id || "");
          if (matchedContact?.contact_type === "Freelancer") setPartyType("Freelancer");
          setPayload(p);
          setNotes(doc.notes || "");
          setTerms(doc.terms || "");
          setDuplicateSourceNo(doc.doc_no);
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
      setDocNo(await generateNextDocNo("nda", META.prefixCode, issueDate));
    };
    void generate();
  }, [issueDate, isEditMode]);

  const validateStep1 = () => {
    if (!counterparty.name.trim()) { toast.error("Counterparty name is required."); return false; }
    if (!docNo || docNo === "Generating...") { toast.error("Please wait for the document number to generate."); return false; }
    if (!isValidDateOnly(issueDate)) { toast.error("Issue date must be a valid date."); return false; }
    return true;
  };

  const nextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!payload.confidential_info_definition.trim()) {
      toast.error("A definition of confidential information is required.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(isEditMode ? "Saving NDA..." : "Creating NDA...");

    const finalPayload: NdaPayload = { ...payload, receiving_party: payload.receiving_party || counterparty.name };

    const row = {
      document_type: "nda" as const,
      doc_no: docNo,
      title: title || `NDA - ${counterparty.name}`,
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
        toast.success("NDA updated.", { id: loadingToast });
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

        toast.success(`NDA ${row.doc_no} created.`, { id: loadingToast });
        router.push(`/documents/${data.id}`);
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading NDA editor...</div>;
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
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{isEditMode ? "Edit NDA" : "New NDA"}</h1>
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Counterparty &amp; NDA Details</h2>

              <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-[#0A0A0A] md:w-auto">
                <button type="button" onClick={() => handlePartyTypeChange("Customer")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all md:w-32 ${partyType === "Customer" ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Client</button>
                <button type="button" onClick={() => handlePartyTypeChange("Freelancer")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all md:w-32 ${partyType === "Freelancer" ? "bg-white text-purple-600 shadow-sm dark:bg-gray-800 dark:text-purple-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Vendor</button>
              </div>

              <ContactSelect contacts={contacts} contactType={partyType} selectedContactId={selectedContactId} onSelect={handleContactSelect} label={`Select ${partyType === "Customer" ? "Client" : "Vendor"}`} />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>{partyType === "Customer" ? "Client" : "Vendor"} Name *</label>
                  <input className={inputClass} value={counterparty.name} onChange={(e) => setCounterparty({ ...counterparty, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Attention / PIC</label>
                  <input className={inputClass} value={counterparty.pic} onChange={(e) => setCounterparty({ ...counterparty, pic: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>NDA Date *</label>
                  <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>NDA No.</label>
                  <input className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-[#151515]`} value={docNo} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Disclosing Party</label>
                  <input className={inputClass} value={payload.disclosing_party} onChange={(e) => setPayload({ ...payload, disclosing_party: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Receiving Party</label>
                  <input className={inputClass} value={payload.receiving_party} onChange={(e) => setPayload({ ...payload, receiving_party: e.target.value })} placeholder={counterparty.name} />
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-gray-500">
                <input type="checkbox" checked={payload.mutual} onChange={(e) => setPayload({ ...payload, mutual: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                Mutual NDA (both parties disclose confidential information)
              </label>

              <div>
                <label className={labelClass}>Status</label>
                <select className={`${inputClass} md:w-64`} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="signed">Signed</option>
                </select>
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Scope &amp; Terms</h2>

              <div>
                <label className={labelClass}>Purpose of Disclosure</label>
                <textarea rows={2} className={inputClass} value={payload.purpose} onChange={(e) => setPayload({ ...payload, purpose: e.target.value })} placeholder="e.g. Evaluating a potential business collaboration." />
              </div>

              <div>
                <label className={labelClass}>Definition of Confidential Information *</label>
                <textarea rows={4} className={inputClass} value={payload.confidential_info_definition} onChange={(e) => setPayload({ ...payload, confidential_info_definition: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Term (Years)</label>
                  <input className={inputClass} value={payload.term_years} onChange={(e) => setPayload({ ...payload, term_years: e.target.value })} />
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
                  {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create NDA"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
