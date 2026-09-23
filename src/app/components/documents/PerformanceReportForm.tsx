"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { fetchContacts, generateNextDocNo } from "../../lib/documents/hooks";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import type { PerformanceReportPayload } from "../../lib/documents/types";
import type { AgencyDocument, Contact } from "../../lib/types";
import { buildContactAddress, formatDateInputInMalaysia, getDateOnlyFromStorage, getErrorMessage, isValidDateOnly } from "../../lib/utils";
import ContactSelect from "./ContactSelect";

const META = getDocumentTypeMeta("performance_report")!;

type Mode = "create" | "edit";

const defaultPayload = (): PerformanceReportPayload => ({
  campaign_name: "",
  reporting_period: "",
  reach: "",
  impressions: "",
  engagement_rate: "",
  deliverables_completed: [],
  learnings: "",
});

export default function PerformanceReportForm({ mode, documentId }: { mode: Mode; documentId?: string }) {
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
  const [payload, setPayload] = useState<PerformanceReportPayload>(defaultPayload());
  const [deliverablesText, setDeliverablesText] = useState("");
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

  useEffect(() => {
    const load = async () => {
      setIsInitialLoading(true);
      const contactList = await fetchContacts().catch(() => []);
      setContacts(contactList);

      if (isEditMode) {
        if (!documentId) { setIsInitialLoading(false); return; }
        const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).single();
        if (error || !data) {
          toast.error("Could not load this report.");
          setIsInitialLoading(false);
          return;
        }
        const doc = data as AgencyDocument;
        const p = { ...defaultPayload(), ...(doc.payload as Partial<PerformanceReportPayload>) };
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
        setPayload(p);
        setDeliverablesText(p.deliverables_completed.join("\n"));
        setNotes(doc.notes || "");
        setTerms(doc.terms || "");
      } else if (duplicateId) {
        const { data, error } = await supabase.from("documents").select("*").eq("id", duplicateId).single();
        if (error || !data) {
          toast.error("Could not load the report to duplicate. Starting blank instead.");
        } else {
          const doc = data as AgencyDocument;
          const p = { ...defaultPayload(), ...(doc.payload as Partial<PerformanceReportPayload>) };
          const matchedContact = contactList.find((c) => c.name === doc.counterparty_name && (!doc.counterparty_email || c.email === doc.counterparty_email));
          setCounterparty({
            name: doc.counterparty_name || "",
            pic: doc.counterparty_pic || "",
            phone: doc.counterparty_phone || "",
            email: doc.counterparty_email || "",
            address: doc.counterparty_address || "",
          });
          setSelectedContactId(matchedContact?.id || "");
          setPayload(p);
          setDeliverablesText(p.deliverables_completed.join("\n"));
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
      setDocNo(await generateNextDocNo("performance_report", META.prefixCode, issueDate));
    };
    void generate();
  }, [issueDate, isEditMode]);

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
    setLoading(true);
    const loadingToast = toast.loading(isEditMode ? "Saving report..." : "Creating report...");

    const finalPayload: PerformanceReportPayload = {
      ...payload,
      deliverables_completed: deliverablesText.split("\n").map((v) => v.trim()).filter(Boolean),
    };

    const row = {
      document_type: "performance_report" as const,
      doc_no: docNo,
      title: title || `Performance Report - ${payload.campaign_name}`,
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
        toast.success("Report updated.", { id: loadingToast });
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

        toast.success(`Report ${row.doc_no} created.`, { id: loadingToast });
        router.push(`/documents/${data.id}`);
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading report editor...</div>;
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
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{isEditMode ? "Edit Performance Report" : "New Performance Report"}</h1>
            {!isEditMode && duplicateSourceNo && (
              <p className="mt-2 text-sm font-bold text-gray-500">Duplicated from {duplicateSourceNo}. Review before saving.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[1, 2].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step === num ? "bg-green-600 text-white shadow-lg shadow-green-500/30" : step > num ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-black" : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"}`}>{step > num ? "✓" : num}</div>
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
                  <label className={labelClass}>Report Date *</label>
                  <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Report No.</label>
                  <input className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-[#151515]`} value={docNo} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Campaign Name *</label>
                  <input className={inputClass} value={payload.campaign_name} onChange={(e) => setPayload({ ...payload, campaign_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Reporting Period</label>
                  <input className={inputClass} value={payload.reporting_period} onChange={(e) => setPayload({ ...payload, reporting_period: e.target.value })} placeholder="e.g. 1 - 30 Sep 2026" />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={nextStep} className="rounded-full bg-green-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/30 transition-all hover:bg-green-700 active:scale-95">
                  Continue &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Metrics &amp; Learnings</h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Reach</label>
                  <input className={inputClass} value={payload.reach} onChange={(e) => setPayload({ ...payload, reach: e.target.value })} placeholder="e.g. 500,000" />
                </div>
                <div>
                  <label className={labelClass}>Impressions</label>
                  <input className={inputClass} value={payload.impressions} onChange={(e) => setPayload({ ...payload, impressions: e.target.value })} placeholder="e.g. 1,200,000" />
                </div>
                <div>
                  <label className={labelClass}>Engagement Rate</label>
                  <input className={inputClass} value={payload.engagement_rate} onChange={(e) => setPayload({ ...payload, engagement_rate: e.target.value })} placeholder="e.g. 4.2%" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Deliverables Completed (one per line)</label>
                <textarea rows={4} className={inputClass} value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} placeholder={"4x Instagram Reels published\n2x TikTok videos published"} />
              </div>

              <div>
                <label className={labelClass}>Learnings &amp; Recommendations</label>
                <textarea rows={4} className={inputClass} value={payload.learnings} onChange={(e) => setPayload({ ...payload, learnings: e.target.value })} />
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
                <button type="button" onClick={handleSubmit} disabled={loading} className="rounded-full bg-green-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/30 transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50">
                  {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Report"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
