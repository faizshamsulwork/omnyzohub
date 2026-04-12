"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import QuickAddMenu from "../components/QuickAddMenu";
import ExpenseAction from "../components/ExpenseAction";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
      
    if (data) setExpenses(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalReceipts = expenses.filter(exp => exp.receipt_url).length;

  const exportToCSV = () => {
    const toastId = toast.loading("Generating tax ledger...");
    const headers = ["Date", "Description", "Category", "Amount (RM)", "Status", "Receipt URL"];
    const rows = expenses.map(exp => [
      exp.date,
      `"${exp.description}"`, 
      exp.category,
      exp.amount.toFixed(2),
      exp.status || "Outstanding",
      exp.receipt_url || "No Receipt"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Omnyzo_Expenses_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger exported successfully!", { id: toastId });
  };

  return (
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Expenses</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Track cashflow and manage tax receipts.</p>
          </div>
          <button onClick={exportToCSV} disabled={expenses.length === 0} className="bg-green-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-green-500/30 hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Tax Ledger (CSV)
          </button>
        </header>

        {/* KAD SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-red-200 dark:border-red-900/30">
            <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-2">Total Expenses</h3>
            <p className="text-3xl font-black text-red-600 dark:text-red-400">RM {totalExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1">{expenses.length} records</p>
          </div>
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-gray-200 dark:border-gray-800">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Receipts Saved</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalReceipts} <span className="text-lg text-gray-400">/ {expenses.length}</span></p>
            <p className="text-[10px] text-gray-500 mt-1">Ready for tax filing</p>
          </div>
        </div>

        {/* JADUAL PERBELANJAAN */}
        <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 min-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><span className="animate-pulse text-gray-400 font-bold">Loading ledger...</span></div>
          ) : expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Receipt</th>
                    {/* 🔴 KOLUM STATUS BARU */}
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Status</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => {
                    const isPaid = exp.status === 'Paid';
                    return (
                    <tr key={exp.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-500">{new Date(exp.date).toLocaleDateString('en-MY')}</td>
                      <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white max-w-[200px] truncate" title={exp.description}>{exp.description}</td>
                      <td className="py-4 px-4 text-sm font-bold text-red-600 dark:text-red-400">RM {Number(exp.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                      
                      <td className="py-4 px-4 text-center">
                        {exp.receipt_url ? (
                          <div className="flex items-center justify-center gap-2">
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:scale-110 transition-transform" title="View Receipt">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </a>
                            <a href={`${exp.receipt_url}?download=`} download className="p-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:scale-110 transition-transform" title="Download Receipt">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No receipt</span>
                        )}
                      </td>

                      {/* 🔴 BADGE STATUS */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isPaid ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'}`}>
                          {isPaid ? "Paid" : "Outstanding"}
                        </span>
                      </td>

                      {/* 🔴 COMPONENT ACTION (ADA BUTANG TOGGLE & DELETE) */}
                      <td className="py-4 px-4 text-right">
                        <ExpenseAction expense={exp} onUpdate={fetchExpenses} />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>
      <QuickAddMenu />
    </div>
  );
}