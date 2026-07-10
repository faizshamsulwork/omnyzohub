"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import ExpenseAction from "../components/ExpenseAction";
import type { Contact, Expense } from "../lib/types";
import {
  buildExpenseDescription,
  createStorageFileName,
  formatMonthLabel,
  getCurrentMonthKeyInMalaysia,
  getErrorMessage,
  getMonthKey,
  getPaymentVoucherPrefix,
  getPreviousMonthKey,
  isSuperadminEmail,
  parseExpenseDescription,
  sortMonthKeysDescending,
} from "../lib/utils";
import { useRouter } from "next/navigation";

type MonthFilter = "current" | "previous" | "all" | "custom";

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [freelancers, setFreelancers] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<MonthFilter>("all");
  const [customMonth, setCustomMonth] = useState(getCurrentMonthKeyInMalaysia());
  const [payeeModal, setPayeeModal] = useState<{ expense: Expense; mode: "generate" | "update" } | null>(null);
  const [selectedPayeeId, setSelectedPayeeId] = useState("");
  const [manualPayeeName, setManualPayeeName] = useState("");
  
  const [uploadingState, setUploadingState] = useState<{ id: string, type: 'receipt' | 'proof' } | null>(null);

  const fetchExpenses = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!isSuperadminEmail(session?.user?.email)) {
      setIsLoading(false);
      router.replace("/");
      return;
    }

    const [expenseResult, freelancerResult] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false }),
      supabase
        .from('contacts')
        .select('*')
        .eq('contact_type', 'Freelancer')
        .order('name', { ascending: true }),
    ]);
    const { data, error } = expenseResult;
      
    if (error) console.error("Error fetching expenses:", error);
    if (data) setExpenses(data);
    if (freelancerResult.error) console.error("Error fetching payees:", freelancerResult.error);
    if (freelancerResult.data) setFreelancers(freelancerResult.data as Contact[]);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchExpenses(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchExpenses]);

  const currentMonthKey = getCurrentMonthKeyInMalaysia();
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const activeMonthKey = monthFilter === "current"
    ? currentMonthKey
    : monthFilter === "previous"
      ? previousMonthKey
      : monthFilter === "custom"
        ? customMonth
        : null;

  const filteredExpenses = expenses.filter((exp) => {
    const parsed = parseExpenseDescription(exp.description);
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || exp.description?.toLowerCase().includes(query)
      || exp.category?.toLowerCase().includes(query)
      || parsed.payeeName?.toLowerCase().includes(query)
      || parsed.originalVendorName?.toLowerCase().includes(query)
      || parsed.reimbursementTo?.toLowerCase().includes(query)
      || parsed.voucherNo?.toLowerCase().includes(query);
    const matchesMonth = !activeMonthKey || getMonthKey(exp.date) === activeMonthKey;

    return matchesSearch && matchesMonth;
  });

  const expenseGroups = filteredExpenses.reduce<Record<string, Expense[]>>((groups, expense) => {
    const monthKey = getMonthKey(expense.date);
    groups[monthKey] = [...(groups[monthKey] || []), expense];
    return groups;
  }, {});
  const expenseMonthKeys = Object.keys(expenseGroups).sort(sortMonthKeysDescending);
  const selectedPeriodLabel = activeMonthKey ? formatMonthLabel(activeMonthKey) : "All Months";

  const paidExpenses = filteredExpenses.filter(exp => exp.status === 'Paid');
  const totalExpenses = paidExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalDocumentsSaved = filteredExpenses.reduce((sum, exp) => {
    return sum + (exp.receipt_url ? 1 : 0) + (exp.payment_proof_url ? 1 : 0);
  }, 0);
  const totalDocumentsRequired = filteredExpenses.length * 2;

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string, type: 'receipt' | 'proof') => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileName = createStorageFileName(file.name);
    
    setUploadingState({ id, type });
    const toastMessage = type === 'receipt' ? "Uploading Vendor Invoice..." : "Uploading Payment Proof...";
    const toastId = toast.loading(toastMessage);

    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`, { id: toastId });
      setUploadingState(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    
    const columnToUpdate = type === 'receipt' ? 'receipt_url' : 'payment_proof_url';
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ [columnToUpdate]: publicUrlData.publicUrl })
      .eq('id', id);

    if (!updateError) {
      toast.success("Document attached successfully!", { id: toastId });
      fetchExpenses();
    } else {
      toast.error(`Database error: ${updateError.message}`, { id: toastId });
    }
    setUploadingState(null);
  };

  const findPayeeContact = (payeeName?: string | null) => {
    const cleanPayeeName = (payeeName || "").trim().toLowerCase();
    if (!cleanPayeeName) return null;

    return freelancers.find((freelancer) => {
      const cleanContactName = freelancer.name.trim().toLowerCase();
      return cleanContactName === cleanPayeeName
        || cleanContactName.includes(cleanPayeeName)
        || cleanPayeeName.includes(cleanContactName);
    }) || null;
  };

  const openPayeeModal = (expense: Expense, mode: "generate" | "update") => {
    const parsed = parseExpenseDescription(expense.description);
    const matchedPayee = findPayeeContact(parsed.payeeName);

    setSelectedPayeeId(matchedPayee?.id || (parsed.payeeName ? "__manual__" : ""));
    setManualPayeeName(matchedPayee ? "" : parsed.payeeName || "");
    setPayeeModal({ expense, mode });
  };

  const getNextPaymentVoucherNo = async (dateInput: string) => {
    const prefix = getPaymentVoucherPrefix(dateInput);
    const { data: existingVouchers } = await supabase
      .from("expenses")
      .select("description")
      .like("description", `[%${prefix}%] %`)
      .order("created_at", { ascending: false });

    const maxVoucherNo = (existingVouchers || []).reduce((max: number, curr: Pick<Expense, "description">) => {
      const voucherNo = parseExpenseDescription(curr.description).voucherNo;
      const match = voucherNo?.match(/-PV(\d+)$/);
      if (!match) return max;
      const num = parseInt(match[1]);
      return num > max ? num : max;
    }, 0);

    return `${prefix}${String(maxVoucherNo + 1).padStart(2, '0')}`;
  };

  const handleGeneratePV = async (exp: Expense, payeeNameOverride?: string) => {
    const parsed = parseExpenseDescription(exp.description);
    const payeeName = (payeeNameOverride || parsed.reimbursementTo || parsed.payeeName || "").trim();

    if (!payeeName) {
      openPayeeModal(exp, parsed.voucherNo ? "update" : "generate");
      return;
    }

    const toastId = toast.loading(parsed.voucherNo ? "Updating voucher payee..." : parsed.paidPersonally ? "Generating Reimbursement Voucher..." : "Generating Payment Voucher...");

    try {
      const voucherNo = parsed.voucherNo || await getNextPaymentVoucherNo(exp.date);
      const newDescription = buildExpenseDescription({
        voucherNo,
        payeeName,
        originalVendorName: parsed.originalVendorName,
        paidPersonally: parsed.paidPersonally,
        itemDesc: parsed.itemDesc,
      });

      const { error: updateError } = await supabase
        .from('expenses')
        .update({ description: newDescription })
        .eq('id', exp.id);

      if (updateError) throw updateError;

      toast.success(
        parsed.voucherNo ? `Voucher payee updated to ${payeeName}.` : `${parsed.paidPersonally ? "Reimbursement" : "Payment"} Voucher ${voucherNo} generated!`,
        { id: toastId }
      );
      setPayeeModal(null);
      fetchExpenses(); 

    } catch (error: unknown) {
      toast.error(`Error generating PV: ${getErrorMessage(error)}`, { id: toastId });
    }
  };

  const handleSavePayeeFromModal = () => {
    if (!payeeModal) return;

    const selectedPayee = freelancers.find((freelancer) => freelancer.id === selectedPayeeId);
    const payeeName = selectedPayee?.name || manualPayeeName.trim();

    if (!payeeName) {
      toast.error("Please select or type the payee for this voucher.");
      return;
    }

    void handleGeneratePV(payeeModal.expense, payeeName);
  };

  const exportToCSV = () => {
    const toastId = toast.loading("Generating tax ledger...");
    const escapeCsv = (value: string | number | null | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["Date", "Voucher No", "Type", "Payee / Reimburse To", "Original Vendor", "Description", "Category", "Amount (RM)", "Status", "Vendor Invoice", "Payment Proof"];
    const rows = filteredExpenses.map(exp => {
      const parsed = parseExpenseDescription(exp.description);
      return [
      exp.date,
      parsed.voucherNo || "",
      parsed.paidPersonally ? "Reimbursement" : "Direct Payment",
      parsed.reimbursementTo || parsed.payeeName || "",
      parsed.originalVendorName || "",
      parsed.itemDesc,
      exp.category,
      Number(exp.amount).toFixed(2),
      exp.status || "Outstanding",
      exp.receipt_url || "No Invoice",
      exp.payment_proof_url || "No Proof"
    ].map(escapeCsv);
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.map(escapeCsv).join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const periodSlug = activeMonthKey || "all";
    link.setAttribute("download", `Omnyzo_Expenses_Ledger_${periodSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger exported successfully!", { id: toastId });
  };

  return (
    <div className="min-h-screen p-6 pb-32 transition-colors duration-500 md:p-10 lg:p-12">
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Expenses</h1>
            <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">Track cashflow and manage dual-documents for tax.</p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={filteredExpenses.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-green-600 px-6 text-sm font-bold text-white shadow-lg shadow-green-500/30 transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Tax Ledger (CSV)
          </button>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="relative w-full xl:max-w-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search expenses, payee, voucher..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-[18px] border border-gray-200 bg-white/60 pl-11 pr-4 text-sm backdrop-blur-xl transition-all focus:ring-2 focus:ring-green-500 dark:border-gray-800 dark:bg-[#111111]/60"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value as MonthFilter)}
              className="h-12 rounded-[18px] border border-gray-200 bg-white/60 px-4 text-sm font-bold text-gray-700 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-800 dark:bg-[#111111]/60 dark:text-gray-300"
            >
              <option value="current">This Month</option>
              <option value="previous">Previous Month</option>
              <option value="all">All Months</option>
              <option value="custom">Custom Month</option>
            </select>
            {monthFilter === "custom" && (
              <input
                type="month"
                value={customMonth}
                onChange={(event) => setCustomMonth(event.target.value)}
                className="h-12 rounded-[18px] border border-gray-200 bg-white/60 px-4 text-sm font-bold text-gray-700 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-800 dark:bg-[#111111]/60 dark:text-gray-300 dark:[color-scheme:dark]"
              />
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-red-200 bg-white/60 p-6 backdrop-blur-xl dark:border-red-900/30 dark:bg-[#111111]/60">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-red-500">Total Expenses</h3>
            <p className="text-3xl font-black text-red-600 dark:text-red-400">RM {totalExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="mt-1 text-[10px] text-gray-500">{paidExpenses.length} paid records</p>
          </div>
          <div className="rounded-[24px] border border-gray-200 bg-white/60 p-6 backdrop-blur-xl dark:border-gray-800 dark:bg-[#111111]/60">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">Documents Saved</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalDocumentsSaved} <span className="text-lg text-gray-400">/ {totalDocumentsRequired}</span></p>
            <p className="mt-1 text-[10px] text-gray-500">Vendor invoices and payment proofs</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-gray-200 bg-white/80 shadow-2xl backdrop-blur-2xl dark:border-gray-800 dark:bg-[#111111]/80">
            <span className="animate-pulse font-bold text-gray-400">Loading ledger...</span>
          </div>
        ) : filteredExpenses.length > 0 ? (
          <div className="space-y-5">
            {expenseMonthKeys.map((monthKey) => {
              const monthExpenses = expenseGroups[monthKey];
              const monthPaidTotal = monthExpenses
                .filter((exp) => exp.status === "Paid")
                .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
              const monthMissingDocuments = monthExpenses.reduce((sum, exp) => {
                return sum + (exp.receipt_url ? 0 : 1) + (exp.payment_proof_url ? 0 : 1);
              }, 0);

              return (
                <section key={monthKey} className="overflow-hidden rounded-[28px] border border-gray-200 bg-white/80 shadow-2xl backdrop-blur-2xl dark:border-gray-800 dark:bg-[#111111]/80">
                  <div className="grid gap-5 border-b border-gray-200 bg-gray-50/70 px-6 py-5 dark:border-gray-800 dark:bg-black/20 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{formatMonthLabel(monthKey)}</h2>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-gray-400">{monthExpenses.length} records</p>
                    </div>
                    <div className="grid grid-cols-2 gap-5 md:text-right">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Paid</p>
                        <p className="mt-1 whitespace-nowrap text-lg font-black text-red-600 dark:text-red-400">RM {monthPaidTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Missing Docs</p>
                        <p className={`mt-1 text-lg font-black ${monthMissingDocuments > 0 ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>{monthMissingDocuments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
                      <colgroup>
                        <col className="w-[11%]" />
                        <col className="w-[30%]" />
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[11%]" />
                        <col className="w-[23%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Date</th>
                          <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Description</th>
                          <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                          <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest text-gray-400">Docs</th>
                          <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest text-gray-400">Status</th>
                          <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                        {monthExpenses.map((exp) => {
                          const isPaid = exp.status === 'Paid';
                          const parsedExpense = parseExpenseDescription(exp.description);
                          const isSystemPV = Boolean(parsedExpense.voucherNo);
                          const isReimbursement = parsedExpense.paidPersonally;
                          const isDrawings = exp.category?.includes('Owner Drawings') || exp.description?.toLowerCase().includes('ambilan');
                          const displayDescription = parsedExpense.itemDesc || exp.description;
                          const statusLabel = isReimbursement
                            ? isPaid ? "Reimbursed" : "Claim Pending"
                            : isPaid ? "Paid" : "Outstanding";

                          return (
                            <tr key={exp.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40">
                              <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-500">
                                {new Date(exp.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>

                              <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white" title={exp.description}>
                                {isSystemPV ? (
                                  <Link href={`/vouchers/${exp.id}`} className="block truncate transition-colors hover:text-purple-500 dark:hover:text-purple-400">
                                    {displayDescription}
                                  </Link>
                                ) : (
                                  <span className="block truncate">{displayDescription}</span>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                  {parsedExpense.voucherNo && (
                                    <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                      {parsedExpense.voucherNo}
                                    </span>
                                  )}
                                  {isReimbursement && (
                                    <span className="max-w-full truncate rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                      Vendor: {parsedExpense.originalVendorName || "Not set"}
                                    </span>
                                  )}
                                  {isReimbursement && (
                                    <span className="max-w-full truncate rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                      Claim to: {parsedExpense.reimbursementTo || parsedExpense.payeeName || "Not set"}
                                    </span>
                                  )}
                                  {!isDrawings && !isReimbursement && (
                                    <span className={`max-w-full truncate rounded-full px-2.5 py-1 ${parsedExpense.payeeName ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
                                      {parsedExpense.payeeName ? `Payee: ${parsedExpense.payeeName}` : "Payee not set"}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-4 text-right text-sm font-black tabular-nums text-red-600 dark:text-red-400">
                                RM {Number(exp.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  {exp.receipt_url ? (
                                    <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform hover:scale-105 dark:bg-blue-900/30 dark:text-blue-400" title="View Vendor Invoice">
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </a>
                                  ) : (
                                    <div className="group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:border-gray-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400" title="Quick Attach Vendor Invoice">
                                      <input
                                        type="file"
                                        accept="image/*, application/pdf"
                                        onChange={(e) => handleQuickUpload(e, exp.id, 'receipt')}
                                        disabled={uploadingState?.id === exp.id}
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                      />
                                      {uploadingState?.id === exp.id && uploadingState?.type === 'receipt' ? (
                                        <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                      ) : (
                                        <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      )}
                                    </div>
                                  )}

                                  {exp.payment_proof_url ? (
                                    <a href={exp.payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform hover:scale-105 dark:bg-purple-900/30 dark:text-purple-400" title="View Payment Proof">
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </a>
                                  ) : (
                                    <div className="group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-500 dark:border-gray-700 dark:hover:bg-purple-900/20 dark:hover:text-purple-400" title="Quick Attach Payment Proof">
                                      <input
                                        type="file"
                                        accept="image/*, application/pdf"
                                        onChange={(e) => handleQuickUpload(e, exp.id, 'proof')}
                                        disabled={uploadingState?.id === exp.id}
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                      />
                                      {uploadingState?.id === exp.id && uploadingState?.type === 'proof' ? (
                                        <svg className="h-4 w-4 animate-spin text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                      ) : (
                                        <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex min-w-[104px] justify-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${isPaid ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400' : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                  {statusLabel}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSystemPV ? (
                                    <Link href={`/vouchers/${exp.id}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shadow-sm transition-all hover:scale-105 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:hover:bg-purple-800/60" title="View Generated Voucher">
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </Link>
                                  ) : !isDrawings && (
                                    <button onClick={() => handleGeneratePV(exp)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm transition-all hover:scale-105 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-800/60" title={parsedExpense.payeeName ? "Generate Payment Voucher" : "Set Payee and Generate Voucher"}>
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </button>
                                  )}

                                  {isSystemPV && !isDrawings && (
                                    <button onClick={() => openPayeeModal(exp, "update")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm transition-all hover:scale-105 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-800/60" title="Set or Change Voucher Payee">
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A8.966 8.966 0 0112 15c2.21 0 4.234.8 5.879 2.129M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                  )}

                                  <ExpenseAction expense={exp} onUpdate={fetchExpenses} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-gray-200 bg-white/80 py-20 text-gray-500 shadow-2xl backdrop-blur-2xl dark:border-gray-800 dark:bg-[#111111]/80">
            <svg className="mb-4 h-12 w-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            No expenses recorded yet.
            <span className="mt-2 text-xs text-gray-400">{selectedPeriodLabel}</span>
          </div>
        )}
      </div>
	      {payeeModal && (
	        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
	          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#111111]">
	            <div className="mb-5">
	              <p className="text-[11px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-300">
	                {payeeModal.mode === "generate" ? "Generate Payment Voucher" : "Fix Voucher Payee"}
	              </p>
	              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white">Select Beneficiary</h2>
	              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
	                This is the person or vendor who will receive the payment. Project/client names should stay in the description only.
	              </p>
	            </div>

	            <div className="space-y-4">
	              <div>
	                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Payee</label>
	                <select
	                  value={selectedPayeeId}
	                  onChange={(event) => {
	                    setSelectedPayeeId(event.target.value);
	                    if (event.target.value !== "__manual__") setManualPayeeName("");
	                  }}
	                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-bold text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-purple-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white"
	                >
	                  <option value="">Choose from contact directory</option>
	                  {freelancers.map((freelancer) => (
	                    <option key={freelancer.id} value={freelancer.id}>
	                      {freelancer.name}{freelancer.service_role ? ` (${freelancer.service_role})` : ""}
	                    </option>
	                  ))}
	                  <option value="__manual__">Manual payee not in directory</option>
	                </select>
	              </div>

	              {selectedPayeeId === "__manual__" && (
	                <div>
	                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Manual Payee Name</label>
	                  <input
	                    type="text"
	                    value={manualPayeeName}
	                    onChange={(event) => setManualPayeeName(event.target.value)}
	                    placeholder="Name as per invoice / bank account"
	                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-bold text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-purple-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white"
	                  />
	                </div>
	              )}

	              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-[#0A0A0A]">
	                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Voucher Description</p>
	                <p className="mt-1 font-bold text-gray-900 dark:text-white">
	                  {parseExpenseDescription(payeeModal.expense.description).itemDesc}
	                </p>
	              </div>
	            </div>

	            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
	              <button
	                type="button"
	                onClick={() => setPayeeModal(null)}
	                className="rounded-full px-5 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
	              >
	                Cancel
	              </button>
	              <button
	                type="button"
	                onClick={handleSavePayeeFromModal}
	                className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-500 active:scale-95"
	              >
	                {payeeModal.mode === "generate" ? "Generate Voucher" : "Save Payee"}
	              </button>
	            </div>
	          </div>
	        </div>
	      )}
	    </div>
	  );
	}
