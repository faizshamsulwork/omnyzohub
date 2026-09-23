"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // 🔴 IMPORT TOAST UNTUK NOTIFICATION
import type { Asset } from "../lib/types";
import { createStorageFileName, isSuperadminEmail, toNumber, formatCurrency } from "../lib/utils";
import {
  TAX_RULES,
  DEFAULT_TAX_PROFILE,
  TAX_ESTIMATE_DISCLAIMER,
  type TaxRuleCode,
  getSuggestedTaxRuleCode,
  calculateDashboardTaxSummary,
  calculateAssetAllowance,
  getAssetTaxStatus,
  type TaxableAssetInput,
  getTaxRuleTreatmentLabel,
  TAX_STATUS_LABELS,
  TAX_STATUS_BADGE_CLASSES,
} from "../lib/tax";

// Only the columns the dashboard actually needs -- no `select('*')`, and
// definitely no document binaries (documents are plain storage URLs, only
// ever fetched when a user clicks one). See PART 8/9 of the module spec.
const ASSET_COLUMNS =
  "id, item_name, category, purchase_date, amount, notes, receipt_url, " +
  "supplier_name, placed_in_use_date, business_use_percentage, source_type, " +
  "tax_rule_code, tax_rule_confirmed, tax_basis_status";

const SOURCE_TYPE_OPTIONS: { value: NonNullable<Asset["source_type"]>; label: string }[] = [
  { value: "purchased_by_business", label: "Purchased by Business" },
  { value: "owner_contribution", label: "Owner Contribution" },
  { value: "personal_to_business_transfer", label: "Personal-to-Business Transfer" },
  { value: "other", label: "Other" },
];

const TAX_RULE_OPTIONS = Object.values(TAX_RULES).filter((r) => r.code !== "ICT_ACA_2026_OPTIONAL");

function toTaxableInput(asset: Asset): TaxableAssetInput {
  return {
    id: asset.id,
    purchaseCost: toNumber(asset.amount),
    purchaseDate: asset.purchase_date,
    placedInUseDate: asset.placed_in_use_date ?? null,
    businessUsePercentage:
      asset.business_use_percentage === null || asset.business_use_percentage === undefined
        ? null
        : Number(asset.business_use_percentage),
    taxRuleCode: (asset.tax_rule_code as TaxRuleCode) ?? null,
    taxRuleConfirmed: Boolean(asset.tax_rule_confirmed),
    taxBasisStatus: asset.tax_basis_status ?? null,
  };
}

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTaxSection, setShowTaxSection] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // 🔴 STATE BARU UNTUK QUICK UPLOAD
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Year of Assessment selector (PART 23) -- defaults to the current calendar year.
  const currentYA = new Date().getFullYear();
  const [assessmentYear, setAssessmentYear] = useState<number>(currentYA);
  const yaOptions = [currentYA - 1, currentYA, currentYA + 1, currentYA + 2];

  // Core form fields
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("ICT Equipment (3 Years)");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [supplierName, setSupplierName] = useState("");

  // Tax treatment fields (progressive disclosure -- PART 39)
  const [businessUsePercentage, setBusinessUsePercentage] = useState("100");
  const [sourceType, setSourceType] = useState<NonNullable<Asset["source_type"]>>("purchased_by_business");
  const [usedFromPurchaseDate, setUsedFromPurchaseDate] = useState(false);
  const [placedInUseDate, setPlacedInUseDate] = useState("");
  const [taxRuleCode, setTaxRuleCode] = useState<string>("");
  const [taxRuleConfirmed, setTaxRuleConfirmed] = useState(false);
  const [taxBasisStatus, setTaxBasisStatus] = useState<string>("");

  const suggestedRuleCode = getSuggestedTaxRuleCode(category, parseFloat(amount) || 0);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";

    if (!isSuperadminEmail(email)) {
      setIsLoading(false);
      router.replace("/");
      return;
    }

    const { data, error } = await supabase
      .from('assets')
      .select(ASSET_COLUMNS)
      .order('purchase_date', { ascending: false });

    if (error) console.error("Error fetching assets:", error);
    if (data) setAssets(data as unknown as Asset[]);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  // 🔴 FUNGSI QUICK UPLOAD DARI DALAM JADUAL (MACAM EXPENSES)
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileName = createStorageFileName(file.name);

    setUploadingId(id);
    const toastId = toast.loading("Uploading asset receipt...");

    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`, { id: toastId });
      setUploadingId(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('assets')
      .update({ receipt_url: publicUrlData.publicUrl })
      .eq('id', id);

    if (!updateError) {
      toast.success("Receipt attached successfully!", { id: toastId });
      fetchData();
    } else {
      toast.error(`Database error: ${updateError.message}`, { id: toastId });
    }
    setUploadingId(null);
  };

  const resetForm = () => {
    setEditingAssetId(null);
    setItemName("");
    setCategory("ICT Equipment (3 Years)");
    setPurchaseDate("");
    setAmount("");
    setNotes("");
    setReceiptFile(null);
    setSupplierName("");
    setBusinessUsePercentage("100");
    setSourceType("purchased_by_business");
    setUsedFromPurchaseDate(false);
    setPlacedInUseDate("");
    setTaxRuleCode("");
    setTaxRuleConfirmed(false);
    setTaxBasisStatus("");
    setShowTaxSection(false);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setItemName(asset.item_name);
    setCategory(asset.category);
    setPurchaseDate(asset.purchase_date?.slice(0, 10) || "");
    setAmount(String(toNumber(asset.amount)));
    setNotes(asset.notes || "");
    setReceiptFile(null);
    setSupplierName(asset.supplier_name || "");
    setBusinessUsePercentage(
      asset.business_use_percentage === null || asset.business_use_percentage === undefined
        ? "100"
        : String(asset.business_use_percentage),
    );
    setSourceType(asset.source_type || "purchased_by_business");
    const placedDate = asset.placed_in_use_date?.slice(0, 10) || "";
    setPlacedInUseDate(placedDate);
    setUsedFromPurchaseDate(Boolean(placedDate) && placedDate === asset.purchase_date?.slice(0, 10));
    setTaxRuleCode(asset.tax_rule_code || "");
    setTaxRuleConfirmed(Boolean(asset.tax_rule_confirmed));
    setTaxBasisStatus(asset.tax_basis_status || "");
    setShowTaxSection(Boolean(asset.tax_rule_code || asset.source_type === "personal_to_business_transfer"));
    setShowForm(true);
  };

  // 🔴 FUNGSI SUBMIT DIPERBAIKI: HANTAR GAMBAR KE SUPABASE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(editingAssetId ? "Updating asset..." : "Saving new asset...");

    let receiptUrl: string | null = editingAssetId
      ? assets.find((a) => a.id === editingAssetId)?.receipt_url ?? null
      : null;

    // Kalau user ada attach gambar resit masa isi form
    if (receiptFile) {
      const fileName = createStorageFileName(receiptFile.name);
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = publicUrlData.publicUrl;
      }
    }

    const resolvedPlacedInUseDate = usedFromPurchaseDate ? purchaseDate : (placedInUseDate || null);
    const businessUsePct = businessUsePercentage.trim() === "" ? null : Math.max(0, Math.min(100, parseFloat(businessUsePercentage)));

    const payload = {
      item_name: itemName,
      category: category,
      purchase_date: purchaseDate,
      amount: parseFloat(amount),
      notes: notes,
      receipt_url: receiptUrl,
      supplier_name: supplierName.trim() || null,
      business_use_percentage: businessUsePct,
      source_type: sourceType,
      placed_in_use_date: resolvedPlacedInUseDate,
      tax_rule_code: taxRuleCode || null,
      tax_rule_confirmed: taxRuleCode ? taxRuleConfirmed : false,
      tax_basis_status: taxBasisStatus || null,
    };

    const { error } = editingAssetId
      ? await supabase.from('assets').update(payload).eq('id', editingAssetId)
      : await supabase.from('assets').insert([payload]);

    if (!error) {
      toast.success(editingAssetId ? "Asset updated successfully!" : "Asset saved successfully!", { id: toastId });
      resetForm();
      setShowForm(false);
      fetchData();
    } else {
      toast.error("Error saving asset: " + error.message, { id: toastId });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      const toastId = toast.loading("Deleting asset...");
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (!error) {
        toast.success("Asset deleted.", { id: toastId });
        fetchData();
      } else {
        toast.error("Failed to delete.", { id: toastId });
      }
    }
  };

  const taxInputs = useMemo(() => assets.map(toTaxableInput), [assets]);

  const suggestedRuleFor = useCallback(
    (input: TaxableAssetInput) => {
      const asset = assets.find((a) => a.id === input.id);
      if (!asset) return undefined;
      return getSuggestedTaxRuleCode(asset.category, toNumber(asset.amount));
    },
    [assets],
  );

  const summary = useMemo(
    () => calculateDashboardTaxSummary(taxInputs, assessmentYear, DEFAULT_TAX_PROFILE, suggestedRuleFor),
    [taxInputs, assessmentYear, suggestedRuleFor],
  );

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Assets...</div>;
  }

  return (
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500 pb-32">
      <div className="max-w-6xl mx-auto relative z-10">

        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Company Assets</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
              Manage equipment, gadgets, and estimate capital allowance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Year of Assessment</label>
              <select
                value={assessmentYear}
                onChange={(e) => setAssessmentYear(Number(e.target.value))}
                className="bg-white/70 dark:bg-[#111111]/70 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              >
                {yaOptions.map((ya) => (
                  <option key={ya} value={ya} className="dark:bg-[#111]">YA {ya}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg self-end"
            >
              {showForm ? "Close Form" : "+ Add New Asset"}
            </button>
          </div>
        </header>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-8 italic">{TAX_ESTIMATE_DISCLAIMER}</p>

        {summary.assetsNeedingReview.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-5 py-3">
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {summary.assetsNeedingReview.length} Asset{summary.assetsNeedingReview.length > 1 ? "s" : ""} Need Tax Review
            </span>
            {summary.potentialAllowancePendingReview > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-500">
                · Potential Allowance Pending Review: {formatCurrency(summary.potentialAllowancePendingReview)}
              </span>
            )}
          </div>
        )}

        {summary.smallValueLimitExceeded && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-5 py-3 text-sm font-medium text-red-700 dark:text-red-400">
            {formatCurrency(summary.smallValueExcessAmount)} of small-value-eligible assets exceeds the {formatCurrency(summary.smallValueAnnualLimit)} annual limit for YA {assessmentYear} — the excess needs standard capital allowance treatment instead.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-gray-200 dark:border-gray-800">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Asset Cost</h3>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(summary.totalAssetCost)}</p>
            <p className="text-[11px] text-gray-400 mt-2">Recorded acquisition/value of registered assets.</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl p-6 rounded-[24px] border border-amber-200 dark:border-amber-900/30">
            <h3 className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>⚡</span> Small Value Allowance — YA {assessmentYear}
            </h3>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{formatCurrency(summary.confirmedSmallValueAllowance)}</p>
            <p className="text-[11px] text-amber-600/70 dark:text-amber-500/70 mt-2">Estimated special allowance for confirmed eligible small-value assets.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl p-6 rounded-[24px] border border-blue-200 dark:border-blue-900/30">
            <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>📊</span> Est. Capital Allowance — YA {assessmentYear}
            </h3>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatCurrency(summary.confirmedCapitalAllowance)}</p>
            <p className="text-[11px] text-blue-600/70 dark:text-blue-500/70 mt-2">Estimated allowance for confirmed eligible capital assets.</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-xl p-6 rounded-[24px] border border-emerald-200 dark:border-emerald-900/30">
            <h3 className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>Σ</span> Total Est. Asset Allowances — YA {assessmentYear}
            </h3>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(summary.totalConfirmedAllowance)}</p>
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70 mt-2">Small-value allowance + confirmed estimated capital allowance.</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-8 rounded-[32px] border border-gray-200 dark:border-gray-800 mb-12 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
              {editingAssetId ? "Edit Asset" : "Register New Asset"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Item Name (e.g., MacBook M4 Pro)</label>
                  <input required type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">LHDN Category</label>
                  <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none">
                    <option className="dark:bg-[#111]">ICT Equipment (3 Years)</option>
                    <option className="dark:bg-[#111]">Plant & Machinery (6 Years)</option>
                    <option className="dark:bg-[#111]">Office Furniture & Fittings (8 Years)</option>
                    <option className="dark:bg-[#111]">Small Value Asset (&lt; RM2,000)</option>
                    <option className="dark:bg-[#111]">Motor Vehicle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Purchase Date</label>
                  <input required type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Purchase Cost / Asset Value (RM)</label>
                  <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Supplier (Optional)</label>
                  <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" placeholder="e.g., Machines Sdn Bhd" />
                </div>

                <div className="md:col-span-2 mt-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Attach Receipt (Tax Purpose)</label>
                  <div className="flex flex-col sm:flex-row gap-4">

                    <input type="file" id="upload-receipt" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                    <input type="file" id="snap-receipt" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

                    <label htmlFor="upload-receipt" className="flex-1 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all rounded-xl py-4 flex justify-center items-center font-bold text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                      Upload
                    </label>

                    <label htmlFor="snap-receipt" className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 transition-all rounded-xl py-4 flex justify-center items-center font-bold text-sm text-white gap-2 shadow-lg shadow-blue-500/30">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Snap
                    </label>
                  </div>

                  {receiptFile && (
                    <div className="mt-3 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg inline-block">
                      ✓ Selected: {receiptFile.name}
                    </div>
                  )}
                  {!receiptFile && editingAssetId && assets.find((a) => a.id === editingAssetId)?.receipt_url && (
                    <div className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Existing receipt attached — uploading a new file will replace it.
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" placeholder="e.g., Trade-in old M1 Pro, Bought from Machines" />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <button
                  type="button"
                  onClick={() => setShowTaxSection((v) => !v)}
                  className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  <span className={`transition-transform ${showTaxSection ? "rotate-90" : ""}`}>▶</span>
                  Tax Treatment {suggestedRuleCode && !showTaxSection && (
                    <span className="text-[11px] font-normal text-gray-400">(Suggested: {TAX_RULES[suggestedRuleCode].label})</span>
                  )}
                </button>

                {showTaxSection && (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/60 dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Business Use %</label>
                      <input type="number" min={0} max={100} value={businessUsePercentage} onChange={(e) => setBusinessUsePercentage(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Source Type</label>
                      <select
                        value={sourceType}
                        onChange={(e) => {
                          const next = e.target.value as NonNullable<Asset["source_type"]>;
                          setSourceType(next);
                          if (next === "personal_to_business_transfer" && !taxBasisStatus) {
                            setTaxBasisStatus("needs_review");
                          }
                        }}
                        className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none"
                      >
                        {SOURCE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="dark:bg-[#111]">{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <input type="checkbox" checked={usedFromPurchaseDate} onChange={(e) => setUsedFromPurchaseDate(e.target.checked)} className="rounded" />
                        Used for business from purchase date
                      </label>
                      {!usedFromPurchaseDate && (
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Business Use Start Date</label>
                          <input type="date" value={placedInUseDate} onChange={(e) => setPlacedInUseDate(e.target.value)} className="w-full md:w-1/2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" />
                          <p className="text-[11px] text-gray-400 mt-1">Leave blank until confirmed — the asset stays out of confirmed allowance totals until this is set.</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tax Rule</label>
                      <select value={taxRuleCode} onChange={(e) => { setTaxRuleCode(e.target.value); setTaxRuleConfirmed(false); }} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none">
                        <option value="" className="dark:bg-[#111]">
                          {suggestedRuleCode ? `Suggested: ${TAX_RULES[suggestedRuleCode].label} (not set)` : "Not set — needs classification"}
                        </option>
                        {TAX_RULE_OPTIONS.map((rule) => (
                          <option key={rule.code} value={rule.code} className="dark:bg-[#111]">{rule.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tax Basis</label>
                      <select value={taxBasisStatus} onChange={(e) => setTaxBasisStatus(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none">
                        <option value="" className="dark:bg-[#111]">Not flagged</option>
                        <option value="needs_review" className="dark:bg-[#111]">Needs Review</option>
                        <option value="confirmed" className="dark:bg-[#111]">Confirmed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={taxRuleConfirmed} disabled={!taxRuleCode} onChange={(e) => setTaxRuleConfirmed(e.target.checked)} className="rounded mt-0.5" />
                        <span>
                          Confirm tax classification
                          {taxRuleCode && TAX_RULES[taxRuleCode as TaxRuleCode]?.requiresManualClassificationConfirmation && (
                            <span className="block text-[11px] font-normal text-amber-600 dark:text-amber-500 mt-0.5">
                              {TAX_RULES[taxRuleCode as TaxRuleCode].notes}
                            </span>
                          )}
                        </span>
                      </label>
                      {!taxRuleCode && (
                        <p className="text-[11px] text-gray-400 mt-1">Pick a tax rule above before it can be confirmed. Until confirmed, this asset is excluded from confirmed allowance totals.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                {editingAssetId && (
                  <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="px-8 py-3 rounded-xl font-bold text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={isSubmitting} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? "Saving..." : editingAssetId ? "Update Asset" : "Save Asset"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-8 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-xl font-bold mb-6">Registered Assets</h2>

          {assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No assets registered yet.</p>
              <p className="text-sm mt-2">Start adding your equipment to track deductions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Cost (RM)</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tax Treatment</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">YA {assessmentYear} Allowance</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Doc</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const input = toTaxableInput(asset);
                    const status = getAssetTaxStatus(input, assessmentYear);
                    const allowance = calculateAssetAllowance(input, assessmentYear);
                    const effectiveRuleCode = asset.tax_rule_code || getSuggestedTaxRuleCode(asset.category, toNumber(asset.amount));

                    return (
                      <tr key={asset.id} className="group border-b border-gray-100 dark:border-gray-900/50 hover:bg-white dark:hover:bg-[#1A1A1C] hover:shadow-lg hover:shadow-gray-200/30 dark:hover:shadow-black/40 transition-all duration-300 cursor-default rounded-2xl">

                        <td className="py-5 px-4 rounded-l-2xl w-1/4">
                          <p className="font-bold text-sm text-gray-900 dark:text-white max-w-[200px] truncate" title={asset.item_name}>
                            {asset.item_name}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] truncate" title={asset.category}>
                            {asset.category}{asset.supplier_name ? ` · ${asset.supplier_name}` : ""}
                          </p>
                        </td>

                        <td className="py-5 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(asset.purchase_date).toLocaleDateString('en-GB')}
                        </td>

                        <td className="py-5 px-4 text-sm font-black text-right text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(asset.amount)}
                        </td>

                        <td className="py-5 px-4">
                          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 max-w-[180px] truncate block" title={getTaxRuleTreatmentLabel(effectiveRuleCode)}>
                            {getTaxRuleTreatmentLabel(effectiveRuleCode)}
                          </span>
                        </td>

                        <td className="py-5 px-4 text-sm font-bold text-right whitespace-nowrap">
                          {status === "confirmed" || status === "fully_claimed" ? (
                            <span className="text-gray-900 dark:text-white">{formatCurrency(allowance)}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </td>

                        <td className="py-5 px-4">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border max-w-[160px] truncate ${TAX_STATUS_BADGE_CLASSES[status]}`} title={TAX_STATUS_LABELS[status]}>
                            {TAX_STATUS_LABELS[status]}
                          </span>
                        </td>

                        {/* 🔴 SEL BARU UNTUK QUICK UPLOAD / VIEW RESIT */}
                        <td className="py-5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {asset.receipt_url ? (
                              <a href={asset.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:scale-110 transition-transform" title="View Asset Receipt">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </a>
                            ) : (
                              <div className="relative p-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center justify-center group" title="Quick Attach Receipt">
                                <input
                                  type="file"
                                  accept="image/*, application/pdf"
                                  onChange={(e) => handleQuickUpload(e, asset.id)}
                                  disabled={uploadingId === asset.id}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                />
                                {uploadingId === asset.id ? (
                                  <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ) : (
                                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-5 px-4 text-right rounded-r-2xl">
                          <div className="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex justify-end gap-1">
                            <button
                              onClick={() => handleEdit(asset)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm active:scale-95"
                              title="Edit Asset"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm active:scale-95"
                              title="Delete Asset"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
