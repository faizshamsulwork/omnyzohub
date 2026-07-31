"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import InvoiceAction from "../components/InvoiceAction";
import { toast } from "sonner";
import type { Invoice } from "../lib/types";
import {
  formatCurrency,
  formatDateOnly,
  formatMonthLabel,
  getDateOnlyFromStorage,
  getCurrentMonthKeyInMalaysia,
  getInvoiceOutstandingBalance,
  getMonthKey,
  getPreviousMonthKey,
  isPaidStatus,
  isPartialStatus,
  normalizeStatus,
  sortMonthKeysDescending,
} from "../lib/utils";

const csvEscape = (value: string | number) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

type MonthFilter = "current" | "previous" | "all" | "custom";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<MonthFilter>("all");
  const [customMonth, setCustomMonth] = useState(getCurrentMonthKeyInMalaysia());

  // STATES UNTUK MODAL PARTIAL PAYMENT
  const [partialModal, setPartialModal] = useState<{isOpen: boolean, invoice: Invoice | null}>({isOpen: false, invoice: null});
  const [partialAmount, setPartialAmount] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const fetchInvoices = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching invoices:", error);
    if (data) {
      setInvoices(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchInvoices(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchInvoices]);

  // LOGIK SIMPAN BAYARAN (DEPOSIT / BAKI)
  const handleSavePartialPayment = async () => {
    if (!partialAmount || isNaN(Number(partialAmount)) || Number(partialAmount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsSavingPayment(true);
    const loadingToast = toast.loading("Updating payment record...");

    const inv = partialModal.invoice;
    if (!inv) return;
    const invoiceTotal = Number(inv.amount) || 0;
    const paidSoFar = Number(inv.amount_paid) || 0;
    const paymentAmount = Number(partialAmount);
    const outstandingBalance = getInvoiceOutstandingBalance({
      amount: invoiceTotal,
      amountPaid: paidSoFar,
      status: inv.status,
    });

    if (paymentAmount > outstandingBalance) {
      toast.error("Payment amount cannot exceed the outstanding balance.", { id: loadingToast });
      setIsSavingPayment(false);
      return;
    }

    const newPaidAmount = paidSoFar + paymentAmount;

    let newStatus = 'partial';
    if (newPaidAmount >= invoiceTotal) {
      newStatus = 'paid';
    }

    const { error } = await supabase
      .from('invoices')
      .update({ amount_paid: newPaidAmount, status: newStatus })
      .eq('id', inv.id);

    setIsSavingPayment(false);

    if (!error) {
      toast.success("Payment recorded successfully!", { id: loadingToast });
      setPartialModal({ isOpen: false, invoice: null });
      setPartialAmount("");
      fetchInvoices(); // Refresh jadual
    } else {
      toast.error(`Database error: ${error.message}`, { id: loadingToast });
    }
  };

  const currentMonthKey = getCurrentMonthKeyInMalaysia();
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const activeMonthKey = monthFilter === "current"
    ? currentMonthKey
    : monthFilter === "previous"
      ? previousMonthKey
      : monthFilter === "custom"
        ? customMonth
        : null;

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || inv.client_name?.toLowerCase().includes(query)
      || inv.invoice_no?.toLowerCase().includes(query);
    const matchesMonth = !activeMonthKey || getMonthKey(inv.created_at) === activeMonthKey;

    return matchesSearch && matchesMonth;
  });

  const invoiceGroups = filteredInvoices.reduce<Record<string, Invoice[]>>((groups, invoice) => {
    const monthKey = getMonthKey(invoice.created_at);
    groups[monthKey] = [...(groups[monthKey] || []), invoice];
    return groups;
  }, {});
  const invoiceMonthKeys = Object.keys(invoiceGroups).sort(sortMonthKeysDescending);
  const selectedPeriodLabel = activeMonthKey ? formatMonthLabel(activeMonthKey) : "All Months";

  // LOGIK EXPORT CSV (LEDGER JUALAN)
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No data to export.");
      return;
    }

    // Tajuk Kolum Excel
    const headers = ["Invoice No", "Date", "Client Name", "Total Amount (RM)", "Amount Paid (RM)", "Balance (RM)", "Status"];

    // Susun isi data
    const rows = filteredInvoices.map(inv => {
      const date = getDateOnlyFromStorage(inv.created_at);
      const total = Number(inv.amount) || 0;
      const paid = Number(inv.amount_paid) || 0;
      const balance = getInvoiceOutstandingBalance({
        amount: total,
        amountPaid: paid,
        status: inv.status,
      });

      return [
        csvEscape(inv.invoice_no),
        csvEscape(date),
        csvEscape(inv.client_name),
        total.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
        csvEscape(normalizeStatus(inv.status).toUpperCase())
      ].join(",");
    });

    // Gabungkan tajuk dan isi data
    const csvContent = [headers.join(","), ...rows].join("\n");

    // Hasilkan fail dan muat turun
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    const periodSlug = activeMonthKey || "all";
    link.setAttribute("download", `Sales_Ledger_${periodSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Ledger exported successfully!");
  };

  return (
    <div className="min-h-screen p-6 md:p-12 relative transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base font-medium">Manage your billing and track partial payments.</p>
          </div>

          {/* GROUP BUTANG EXPORT & CREATE */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-white dark:bg-[#111111] hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 px-5 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              title="Download as Excel/CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>

            <Link
              href="/new-invoice"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Create Invoice
            </Link>
          </div>
        </header>

        <div className="mb-8 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search by client or invoice no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value as MonthFilter)}
              className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark]"
              />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-12 rounded-[32px] border border-gray-200 dark:border-gray-800 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No invoices found</h3>
            <p className="text-gray-500 text-sm">Create your first invoice or try a different search term.</p>
            <p className="text-gray-400 text-xs mt-2">{selectedPeriodLabel}</p>
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-lg">
            {invoiceMonthKeys.map((monthKey, index) => {
              const monthInvoices = invoiceGroups[monthKey];
              const monthTotal = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
              const monthOutstanding = monthInvoices.reduce((sum, inv) => {
                return sum + getInvoiceOutstandingBalance({
                  amount: inv.amount,
                  amountPaid: inv.amount_paid,
                  status: inv.status,
                });
              }, 0);

              return (
                <section key={monthKey} className={index > 0 ? "border-t border-gray-200 dark:border-gray-800" : ""}>
	                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] items-center gap-5 px-6 py-5 bg-gray-50/60 dark:bg-black/20">
	                    <div>
	                      <h2 className="text-lg font-black text-gray-900 dark:text-white">{formatMonthLabel(monthKey)}</h2>
	                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{monthInvoices.length} invoices</p>
	                    </div>
	                    <div className="grid grid-cols-2 gap-6 md:justify-self-end text-right">
	                      <div className="min-w-0">
	                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
	                        <p className="text-sm md:text-base font-black text-gray-900 dark:text-white tabular-nums whitespace-nowrap">{formatCurrency(monthTotal)}</p>
	                      </div>
	                      <div className="min-w-0">
	                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Outstanding</p>
	                        <p className="text-sm md:text-base font-black text-orange-500 tabular-nums whitespace-nowrap">{formatCurrency(monthOutstanding)}</p>
	                      </div>
	                    </div>
	                  </div>
	                  <div className="overflow-x-auto">
	                    <table className="w-full min-w-[980px] table-fixed text-left border-collapse">
	                      <colgroup>
	                        <col className="w-[25%]" />
	                        <col className="w-[16%]" />
	                        <col className="w-[19%]" />
	                        <col className="w-[20%]" />
	                        <col className="w-[20%]" />
	                      </colgroup>
	                      <thead>
	                        <tr className="border-y border-gray-200 dark:border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 bg-gray-50/50 dark:bg-black/20">
	                          <th className="px-6 py-4 font-bold">Invoice Info</th>
	                          <th className="px-6 py-4 font-bold hidden md:table-cell">Date</th>
	                          <th className="px-6 py-4 font-bold text-right">Amount</th>
	                          <th className="px-6 py-4 font-bold text-center">Status</th>
	                          <th className="px-6 py-4 font-bold text-right">Actions</th>
	                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
	                        {monthInvoices.map((inv) => (
	                          <tr key={inv.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
	                            <td className="px-6 py-5">
	                              <div className="flex flex-col">
	                                <span className="font-bold text-gray-900 dark:text-white">{inv.invoice_no}</span>
	                                <span className="text-sm text-gray-500 truncate max-w-full">{inv.client_name}</span>
	                              </div>
	                            </td>

	                            <td className="px-6 py-5 hidden md:table-cell text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
	                              {formatDateOnly(inv.created_at)}
	                            </td>

	                            <td className="px-6 py-5 text-right">
	                              <div className="font-black text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
	                                {formatCurrency(inv.amount)}
	                              </div>
	                              {Number(inv.amount_paid) > 0 && getInvoiceOutstandingBalance({ amount: inv.amount, amountPaid: inv.amount_paid, status: inv.status }) > 0 && (
                                <div className="flex flex-col items-end mt-1">
                                  <span className="text-[10px] text-gray-500 font-medium">Paid: {formatCurrency(inv.amount_paid)}</span>
                                  <span className="text-[10px] text-orange-500 font-bold">Bal: {formatCurrency(getInvoiceOutstandingBalance({ amount: inv.amount, amountPaid: inv.amount_paid, status: inv.status }))}</span>
                                </div>
                              )}
                            </td>

	                            <td className="px-6 py-5 text-center">
	                              <div className="flex flex-col items-center justify-center gap-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                  isPaidStatus(inv.status)
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : isPartialStatus(inv.status)
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  {inv.status}
                                </span>

                                {!isPaidStatus(inv.status) && (
                                  <button
                                    onClick={() => setPartialModal({ isOpen: true, invoice: inv })}
                                    className="text-[9px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-lg active:scale-95"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    PAYMENT
                                  </button>
                                )}
                              </div>
                            </td>

	                            <td className="px-6 py-5">
	                              <InvoiceAction invoice={inv} onChanged={() => fetchInvoices(false)} />
	                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* MODAL UNTUK REKOD DEPOSIT / PARTIAL PAYMENT */}
        {partialModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-[32px] p-8 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Record Payment</h3>
                <button onClick={() => setPartialModal({ isOpen: false, invoice: null })} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="mb-6 bg-gray-50 dark:bg-[#0A0A0A] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Invoice No.</p>
                <p className="font-bold text-gray-900 dark:text-white mb-4">{partialModal.invoice?.invoice_no}</p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Total Due:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(partialModal.invoice?.amount)}</span>
                  </div>
                  {Number(partialModal.invoice?.amount_paid) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Paid So Far:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(partialModal.invoice?.amount_paid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Current Balance</span>
                    <span className="font-black text-orange-500 text-lg">{formatCurrency(getInvoiceOutstandingBalance({
                      amount: partialModal.invoice?.amount,
                      amountPaid: partialModal.invoice?.amount_paid,
                      status: partialModal.invoice?.status,
                    }))}</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount Received (RM)</label>
                <input
                  type="number"
                  step="0.01"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder={String(getInvoiceOutstandingBalance({
                    amount: partialModal.invoice?.amount,
                    amountPaid: partialModal.invoice?.amount_paid,
                    status: partialModal.invoice?.status,
                  }))}
                  className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-2xl font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPartialModal({ isOpen: false, invoice: null })}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePartialPayment}
                  disabled={isSavingPayment}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
