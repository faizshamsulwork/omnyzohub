"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { fetchContacts, generateNextDocNo } from "../../lib/documents/hooks";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import type { CreatorBriefPayload, DeliverableItem } from "../../lib/documents/types";
import type { AgencyDocument, Contact } from "../../lib/types";
import { buildContactAddress, formatDateInputInMalaysia, getDateOnlyFromStorage, getErrorMessage, isValidDateOnly } from "../../lib/utils";
import ContactSelect from "./ContactSelect";

const META = getDocumentTypeMeta("creator_brief")!;

type Mode = "create" | "edit";

const emptyDeliverable = (): DeliverableItem => ({ format: "", quantity: "1", due_date: "" });

const defaultPayload = (): CreatorBriefPayload => ({
  campaign_name: "",
  brand_client: "",
  platforms: [],
  deliverables: [emptyDeliverable()],
  dos: [],
  donts: [],
  content_guidelines: "",
  hashtags_mentions: "",
  usage_rights_scope: "",
  usage_rights_duration: "",
  exclusivity_period: "",
  submission_deadline: "",
  posting_window: "",
  contact_for_queries: "",
});

export default function CreatorBriefForm({ mode, documentId }: { mode: Mode; documentId?: string }) {
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
  const [payload, setPayload] = useState<CreatorBriefPayload>(defaultPayload());
  const [platformsText, setPlatformsText] = useState("");
  const [dosText, setDosText] = useState("");
  const [dontsText, setDontsText] = useState("");
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
          toast.error("Could not load this brief.");
          setIsInitialLoading(false);
          return;
        }
        const doc = data as AgencyDocument;
        const p = { ...defaultPayload(), ...(doc.payload as Partial<CreatorBriefPayload>) };
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
        setSelectedContactId(doc.counterparty_contact_id || "");
        setPayload(p);
        setPlatformsText(p.platforms.join("\n"));
        setDosText(p.dos.join("\n"));
        setDontsText(p.donts.join("\n"));
        setNotes(doc.notes || "");
        setTerms(doc.terms || "");
      } else if (duplicateId) {
        const { data, error } = await supabase.from("documents").select("*").eq("id", duplicateId).single();
        if (error || !data) {
          toast.error("Could not load the brief to duplicate. Starting a blank brief instead.");
        } else {
          const doc = data as AgencyDocument;
          const p = { ...defaultPayload(), ...(doc.payload as Partial<CreatorBriefPayload>) };
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
          setPlatformsText(p.platforms.join("\n"));
          setDosText(p.dos.join("\n"));
          setDontsText(p.donts.join("\n"));
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
      setDocNo(await generateNextDocNo("creator_brief", META.prefixCode, issueDate));
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

  const validateStep1 = () => {
    if (!counterparty.name.trim()) { toast.error("Creator name is required."); return false; }
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
    if (payload.submission_deadline && !isValidDateOnly(payload.submission_deadline)) {
      toast.error("Submission deadline must be a valid date.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(isEditMode ? "Saving brief..." : "Creating brief...");

    const finalPayload: CreatorBriefPayload = {
      ...payload,
      platforms: platformsText.split("\n").map((v) => v.trim()).filter(Boolean),
      dos: dosText.split("\n").map((v) => v.trim()).filter(Boolean),
      donts: dontsText.split("\n").map((v) => v.trim()).filter(Boolean),
    };

    const row = {
      document_type: "creator_brief" as const,
      doc_no: docNo,
      title: title || payload.campaign_name,
      status,
      counterparty_contact_id: selectedContactId || null,
      counterparty_name: counterparty.name,
      counterparty_pic: counterparty.pic || null,
      counterparty_email: counterparty.email || null,
      counterparty_phone: counterparty.phone || null,
      counterparty_address: counterparty.address || null,
      issue_date: issueDate,
      valid_until: finalPayload.submission_deadline || null,
      payload: finalPayload,
      notes: notes || null,
      terms: terms || null,
    };

    try {
      if (isEditMode) {
        const { error } = await supabase.from("documents").update(row).eq("id", documentId);
        if (error) throw error;
        toast.success("Brief updated.", { id: loadingToast });
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

        toast.success(`Brief ${row.doc_no} created.`, { id: loadingToast });
        router.push(`/documents/${data.id}`);
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading brief editor...</div>;
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
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{isEditMode ? "Edit Brief" : "New Creator Brief"}</h1>
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Creator &amp; Campaign Details</h2>

              <ContactSelect contacts={contacts} contactType="Freelancer" selectedContactId={selectedContactId} onSelect={handleContactSelect} label="Select Creator" />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Creator Name *</label>
                  <input className={inputClass} value={counterparty.name} onChange={(e) => setCounterparty({ ...counterparty, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Contact Person / Manager</label>
                  <input className={inputClass} value={counterparty.pic} onChange={(e) => setCounterparty({ ...counterparty, pic: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} value={counterparty.email} onChange={(e) => setCounterparty({ ...counterparty, email: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={counterparty.phone} onChange={(e) => setCounterparty({ ...counterparty, phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Brief Date *</label>
                  <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Brief No.</label>
                  <input className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-[#151515]`} value={docNo} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Campaign Name *</label>
                  <input className={inputClass} value={payload.campaign_name} onChange={(e) => setPayload({ ...payload, campaign_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Brand / Client</label>
                  <input className={inputClass} value={payload.brand_client} onChange={(e) => setPayload({ ...payload, brand_client: e.target.value })} />
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
                  <label className={labelClass}>Submission Deadline</label>
                  <input type="date" className={inputClass} value={payload.submission_deadline} onChange={(e) => setPayload({ ...payload, submission_deadline: e.target.value })} />
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
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">Deliverables &amp; Guidelines</h2>

              <div>
                <label className={labelClass}>Platforms (one per line)</label>
                <textarea rows={2} className={inputClass} value={platformsText} onChange={(e) => setPlatformsText(e.target.value)} placeholder={"Instagram\nTikTok"} />
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Deliverables *</label>
                {payload.deliverables.map((deliverable, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0A0A0A] md:grid-cols-[1fr_100px_160px_40px]">
                    <input className={inputClass} placeholder="Format (e.g. 1x Reel)" value={deliverable.format} onChange={(e) => updateDeliverable(index, "format", e.target.value)} />
                    <input className={inputClass} placeholder="Qty" value={deliverable.quantity} onChange={(e) => updateDeliverable(index, "quantity", e.target.value)} />
                    <input type="date" className={inputClass} value={deliverable.due_date} onChange={(e) => updateDeliverable(index, "due_date", e.target.value)} />
                    <button type="button" onClick={() => removeDeliverable(index)} disabled={payload.deliverables.length <= 1} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20">
                      <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addDeliverable} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add deliverable</button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Do&apos;s (one per line)</label>
                  <textarea rows={4} className={inputClass} value={dosText} onChange={(e) => setDosText(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Don&apos;ts (one per line)</label>
                  <textarea rows={4} className={inputClass} value={dontsText} onChange={(e) => setDontsText(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Content Guidelines</label>
                <textarea rows={3} className={inputClass} value={payload.content_guidelines} onChange={(e) => setPayload({ ...payload, content_guidelines: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Hashtags / Mentions</label>
                  <input className={inputClass} value={payload.hashtags_mentions} onChange={(e) => setPayload({ ...payload, hashtags_mentions: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Posting Window</label>
                  <input className={inputClass} value={payload.posting_window} onChange={(e) => setPayload({ ...payload, posting_window: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Usage Rights &mdash; Scope</label>
                  <input className={inputClass} value={payload.usage_rights_scope} onChange={(e) => setPayload({ ...payload, usage_rights_scope: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Usage Rights &mdash; Duration</label>
                  <input className={inputClass} value={payload.usage_rights_duration} onChange={(e) => setPayload({ ...payload, usage_rights_duration: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Exclusivity Period</label>
                  <input className={inputClass} value={payload.exclusivity_period} onChange={(e) => setPayload({ ...payload, exclusivity_period: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Contact for Queries</label>
                  <input className={inputClass} value={payload.contact_for_queries} onChange={(e) => setPayload({ ...payload, contact_for_queries: e.target.value })} />
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
                  {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Brief"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
