"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Contact } from "../lib/types";
import {
  buildExpenseDescription,
  createStorageFileName,
  formatDateInputInMalaysia,
  getPaymentVoucherPrefix,
  isSuperadminEmail,
  parseExpenseDescription,
} from "../lib/utils";

export default function NewExpense() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [freelancers, setFreelancers] = useState<Contact[]>([]);
  const [selectedPayeeId, setSelectedPayeeId] = useState("");
  const [manualPayeeName, setManualPayeeName] = useState("");

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "Software & Tools *",
    date: formatDateInputInMalaysia(),
    payment_source: "company",
    original_vendor_name: "",
    reimbursement_to: "Faiz Shamsul",
    receipt_url: "",
    payment_proof_url: ""
  });

  const isVendorCategory = formData.category === "Professional Fees (Vendors) *";
  const isPaidPersonally = formData.payment_source === "personal";
  const requiresDirectPayee = isVendorCategory && !isPaidPersonally;
  const selectedPayee = freelancers.find((freelancer) => freelancer.id === selectedPayeeId);
  const descriptionPlaceholder = isPaidPersonally
    ? "e.g. Video editing for Cagamas - May 2026"
    : isVendorCategory
    ? "e.g. Freelance Services for Cagamas - May 2026"
    : "e.g. Adobe Creative Cloud subscription";

  const handleCategoryChange = (nextCategory: string) => {
    setFormData((current) => ({ ...current, category: nextCategory }));

    if (nextCategory !== "Professional Fees (Vendors) *") {
      setSelectedPayeeId("");
      setManualPayeeName("");
    }
  };

  const handlePaymentSourceChange = (nextSource: string) => {
    setFormData((current) => ({ ...current, payment_source: nextSource }));

    if (nextSource === "personal") {
      setSelectedPayeeId("");
      setManualPayeeName("");
    }
  };

  const handlePayeeChange = (nextPayeeId: string) => {
    setSelectedPayeeId(nextPayeeId);

    if (nextPayeeId === "__manual__") return;

    setManualPayeeName("");
    if (!nextPayeeId) return;

    const nextPayee = freelancers.find((freelancer) => freelancer.id === nextPayeeId);
    const defaultDescription = nextPayee?.service_role
      ? `${nextPayee.service_role} Fee`
      : "Professional Services";

    setFormData((current) => (
      current.description.trim()
        ? current
        : { ...current, description: defaultDescription }
    ));
  };

  useEffect(() => {
    const fetchFreelancers = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!isSuperadminEmail(session?.user?.email)) {
        router.replace("/");
        return;
      }

      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("contact_type", "Freelancer")
        .order("name", { ascending: true });

      if (data) setFreelancers(data);
      setIsAuthorizing(false);
    };
    fetchFreelancers();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'proof') => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileName = createStorageFileName(file.name);

    if (type === 'receipt') setUploadingReceipt(true);
    else setUploadingProof(true);

    const toastMessage = type === 'receipt' ? "Uploading Vendor Invoice..." : "Uploading Bank Slip...";
    const toastId = toast.loading(toastMessage);

    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`, { id: toastId });
      if (type === 'receipt') setUploadingReceipt(false);
      else setUploadingProof(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

    if (type === 'receipt') {
      setFormData((current) => ({ ...current, receipt_url: publicUrlData.publicUrl }));
      setUploadingReceipt(false);
    } else {
      setFormData((current) => ({ ...current, payment_proof_url: publicUrlData.publicUrl }));
      setUploadingProof(false);
    }

    toast.success("Document attached successfully!", { id: toastId });
  };

  const getNextPaymentVoucherNo = async (dateInput: string) => {
    const prefix = getPaymentVoucherPrefix(dateInput);
    const { data: existingVouchers } = await supabase
      .from("expenses")
      .select("description")
      .like("description", `[%${prefix}%] %`)
      .order("created_at", { ascending: false });

    const maxVoucherNo = (existingVouchers || []).reduce((max: number, curr: { description: string }) => {
      const voucherNo = parseExpenseDescription(curr.description).voucherNo;
      const match = voucherNo?.match(/-PV(\d+)$/);
      if (!match) return max;
      const num = parseInt(match[1]);
      return num > max ? num : max;
    }, 0);

    return `${prefix}${String(maxVoucherNo + 1).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payeeName = selectedPayee?.name || manualPayeeName.trim();
    const itemDescription = formData.description.trim();

    if (!itemDescription) {
      toast.error("Please enter the service or expense description.");
      return;
    }

    if (requiresDirectPayee && !payeeName) {
      toast.error("Please select or type the payee before saving a vendor expense.");
      return;
    }

    if (isPaidPersonally && !formData.original_vendor_name.trim()) {
      toast.error("Please enter the original vendor or merchant for this reimbursement claim.");
      return;
    }

    if (isPaidPersonally && !formData.reimbursement_to.trim()) {
      toast.error("Please enter who should be reimbursed.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Saving expense...");
    const voucherNo = isPaidPersonally ? await getNextPaymentVoucherNo(formData.date) : null;
    const storedDescription = isPaidPersonally
      ? buildExpenseDescription({
          voucherNo,
          payeeName: formData.reimbursement_to,
          originalVendorName: formData.original_vendor_name,
          itemDesc: itemDescription,
          paidPersonally: true,
        })
      : requiresDirectPayee
      ? buildExpenseDescription({ payeeName, itemDesc: itemDescription })
      : itemDescription;

    const { error } = await supabase.from("expenses").insert([{
      description: storedDescription,
      amount,
      category: formData.category,
      date: formData.date,
      receipt_url: formData.receipt_url || null,
      payment_proof_url: formData.payment_proof_url || null,
      status: "Outstanding"
    }]);

    if (!error) {
      toast.success(isPaidPersonally && voucherNo ? `Reimbursement claim ${voucherNo} recorded.` : "Expense recorded with documents.", { id: loadingToast });
      router.push("/expenses");
      router.refresh();
    } else {
      toast.error(`Failed to save: ${error.message}`, { id: loadingToast });
      setLoading(false);
    }
  };

  if (isAuthorizing) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Checking access...</div>;
  }

  return (
    <div className="min-h-screen p-8 md:p-12 flex items-center justify-center relative z-10 transition-colors pb-32 md:pb-12">
      <div className="w-full max-w-2xl bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl p-8 md:p-10 rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-500">

        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">Record Expense</h1>
        <p className="text-gray-500 mb-8">Track your cashflow and attach dual-documents for tax filing.</p>

	        <form onSubmit={handleSubmit} className="space-y-6">

	          <div>
	            <label className="block text-sm font-medium text-gray-500 mb-2">Category *</label>
	            <select
	              className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white transition-colors"
	              value={formData.category}
	              onChange={(e) => handleCategoryChange(e.target.value)}
	            >
	              <option value="Software & Tools *">Software & Tools *</option>
	              <option value="Advertising & Marketing *">Advertising & Marketing *</option>
              <option value="Professional Fees (Vendors) *">Professional Fees (Vendors) *</option>
              <option value="Telecommunication & Internet *">Telecommunication & Internet *</option>
              <option value="Client Entertainment (50%) *">Client Entertainment (50%) *</option>
              <option value="Office Supplies & Equipment *">Office Supplies & Equipment *</option>
              <option value="Travel & Transportation *">Travel & Transportation *</option>
              <option value="Rental & Utilities *">Rental & Utilities *</option>
              <option value="Owner Drawings (Personal)">Owner Drawings (Personal)</option>
              <option value="Other">Other Expenses</option>
            </select>
	            <p className="text-[11px] text-gray-400 mt-2 font-medium">
	              <span className="text-blue-500 font-bold">*</span> Indicates expenses generally tax-deductible under LHDN guidelines.
	            </p>
	          </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Payment Source *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handlePaymentSourceChange("company")}
                  className={`rounded-xl border p-4 text-left transition-all ${!isPaidPersonally ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 dark:bg-blue-900/20 dark:text-blue-300" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-gray-800 dark:bg-[#0A0A0A] dark:hover:border-gray-700"}`}
                >
                  <span className="block text-sm font-black">Company Paid Direct</span>
                  <span className="mt-1 block text-xs opacity-75">Payment leaves company bank/card.</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentSourceChange("personal")}
                  className={`rounded-xl border p-4 text-left transition-all ${isPaidPersonally ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 dark:bg-amber-900/20 dark:text-amber-300" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-gray-800 dark:bg-[#0A0A0A] dark:hover:border-gray-700"}`}
                >
                  <span className="block text-sm font-black">Paid Personally / Claim</span>
                  <span className="mt-1 block text-xs opacity-75">You paid first, company reimburses you.</span>
                </button>
              </div>
            </div>

            {isPaidPersonally && (
              <div className="p-5 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-3">
                  Reimbursement Claim
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Original Vendor / Merchant *</label>
                    <input
                      type="text"
                      required={isPaidPersonally}
                      className="w-full p-3 bg-white dark:bg-[#151515] border border-amber-200 dark:border-amber-800 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white transition-colors text-sm font-medium"
                      placeholder="e.g. Canva, OpenAI, Muhammad Amirun"
                      value={formData.original_vendor_name}
                      onChange={(e) => setFormData({ ...formData, original_vendor_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Reimburse To *</label>
                    <input
                      type="text"
                      required={isPaidPersonally}
                      className="w-full p-3 bg-white dark:bg-[#151515] border border-amber-200 dark:border-amber-800 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white transition-colors text-sm font-medium"
                      placeholder="e.g. Faiz Shamsul"
                      value={formData.reimbursement_to}
                      onChange={(e) => setFormData({ ...formData, reimbursement_to: e.target.value })}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  The expense stays under the real vendor/category, while the payment voucher will be payable to the person claiming reimbursement.
                </p>
              </div>
            )}

	          {requiresDirectPayee && (
	            <div className="p-5 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
	              <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
	                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
	                Payee / Beneficiary
	              </label>
	              <select
	                className="w-full p-3 bg-white dark:bg-[#151515] border border-purple-200 dark:border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white transition-colors text-sm font-medium"
	                onChange={(e) => handlePayeeChange(e.target.value)}
	                value={selectedPayeeId}
	                required={requiresDirectPayee}
	              >
	                <option value="">-- Choose from Contact Directory --</option>
	                {freelancers.map(f => (
	                  <option key={f.id} value={f.id}>{f.name} {f.service_role ? `(${f.service_role})` : ''}</option>
	                ))}
	                <option value="__manual__">Manual payee not in directory</option>
	              </select>
	              {selectedPayeeId === "__manual__" && (
	                <input
	                  type="text"
	                  required
	                  className="mt-3 w-full p-3 bg-white dark:bg-[#151515] border border-purple-200 dark:border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white transition-colors text-sm font-medium"
	                  placeholder="Payee name as per invoice / bank account"
	                  value={manualPayeeName}
	                  onChange={(e) => setManualPayeeName(e.target.value)}
	                />
	              )}
	              {selectedPayeeId && selectedPayeeId !== "__manual__" && (
	                <div className="mt-3 text-xs text-purple-700 dark:text-purple-300 bg-white/70 dark:bg-[#151515]/70 border border-purple-100 dark:border-purple-900 rounded-lg p-3">
	                  {selectedPayee?.bank_account
	                    ? `Bank details ready: ${selectedPayee.bank_name || "Bank"} / ${selectedPayee.bank_account}`
	                    : "No bank details saved for this payee yet. Add it in Contacts for a complete voucher."}
	                </div>
	              )}
	            </div>
	          )}

	          <div>
	            <label className="block text-sm font-medium text-gray-500 mb-2">
	              {isPaidPersonally ? "Expense Details / Reason *" : isVendorCategory ? "Service / Project Description *" : "Description / Title *"}
	            </label>
	            <input
	              type="text"
	              required
	              className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-colors"
	              placeholder={descriptionPlaceholder}
	              value={formData.description}
	              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
	            />
	          </div>

	          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
	            <div>
	              <label className="block text-sm font-medium text-gray-500 mb-2">Amount (RM) *</label>
	              <input
	                type="number"
	                step="0.01"
	                required
	                className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-colors"
	                placeholder="0.00"
	                value={formData.amount}
	                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
	              />
	            </div>
	            <div>
	              <label className="block text-sm font-medium text-gray-500 mb-2">Date *</label>
	              <input
	                type="date"
	                required
	                className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-colors dark:[color-scheme:dark]"
	                value={formData.date}
	                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
	              />
	            </div>
	          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Required Documents</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* UPLOAD 1: VENDOR INVOICE */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">1. {isPaidPersonally ? "Original Vendor Receipt" : "Vendor Invoice / Receipt"}</label>
                {formData.receipt_url ? (
                  <div className="w-full h-14 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400">
                    ✓ Invoice Attached
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1 h-14 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-500 transition-colors flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
                      <input type="file" accept="image/*, application/pdf" onChange={(e) => handleFileUpload(e, 'receipt')} disabled={uploadingReceipt} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <span className="text-xs font-bold text-gray-500">{uploadingReceipt ? "..." : "Upload"}</span>
                    </div>
                    <div className="relative flex-1 h-14 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center">
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'receipt')} disabled={uploadingReceipt} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Snap
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* UPLOAD 2: PAYMENT PROOF */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">2. {isPaidPersonally ? "Personal Payment Proof" : "Payment Proof (Slip)"}</label>
                {formData.payment_proof_url ? (
                  <div className="w-full h-14 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400">
                    ✓ Proof Attached
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1 h-14 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-500 transition-colors flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
                      <input type="file" accept="image/*, application/pdf" onChange={(e) => handleFileUpload(e, 'proof')} disabled={uploadingProof} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <span className="text-xs font-bold text-gray-500">{uploadingProof ? "..." : "Upload"}</span>
                    </div>
                    <div className="relative flex-1 h-14 bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center">
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'proof')} disabled={uploadingProof} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Snap
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Link href="/expenses" className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 flex items-center transition-colors">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={loading || uploadingReceipt || uploadingProof} 
              className="bg-blue-600 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
