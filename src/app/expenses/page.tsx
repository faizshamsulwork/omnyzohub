"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import QuickAddMenu from "../components/QuickAddMenu";
import ExpenseAction from "../components/ExpenseAction";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE BARU: Untuk kesan butang mana yang tengah loading (receipt atau proof)
  const [uploadingState, setUploadingState] = useState<{ id: string, type: 'receipt' | 'proof' } | null>(null);

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

  // 🔴 LOGIK BARU: Asingkan yang dah "Paid" untuk pengiraan kotak merah
  const paidExpenses = expenses.filter(exp => exp.status === 'Paid');
  const totalExpenses = paidExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  
  const totalReceipts = expenses.filter(exp => exp.receipt_url || exp.payment_proof_url).length;

  // FUNGSI UPLOAD DI-UPGRADE: Boleh pilih nak upload Invois atau Resit Bank
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string, type: 'receipt' | 'proof') => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
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

  const exportToCSV = () => {
    const toastId = toast.loading("Generating tax ledger...");
    const headers = ["Date", "Description", "Category", "Amount (RM)", "Status", "Vendor Invoice", "Payment Proof"];
    const rows = expenses.map(exp => [
      exp.date,
      `"${exp.description}"`, 
      exp.category,
      exp.amount.toFixed(2),
      exp.status || "Outstanding",
      exp.receipt_url || "No Invoice",
      exp.payment_proof_url || "No Proof"
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
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500 pb-32">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Expenses</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Track cashflow and manage dual-documents for tax.</p>
          </div>
          <button onClick={exportToCSV} disabled={expenses.length === 0} className="bg-green-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-green-500/30 hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Tax Ledger (CSV)
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-red-200 dark:border-red-900/30">
            <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-2">Total Expenses</h3>
            <p className="text-3xl font-black text-red-600 dark:text-red-400">RM {totalExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1">{paidExpenses.length} paid records</p>
          </div>
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-gray-200 dark:border-gray-800">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Documents Saved</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalReceipts} <span className="text-lg text-gray-400">/ {expenses.length}</span></p>
            <p className="text-[10px] text-gray-500 mt-1">Ready for tax filing</p>
          </div>
        </div>

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
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Documents</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Status</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => {
                    const isPaid = exp.status === 'Paid';
                    const isSystemPV = exp.description?.includes('-PV');

                    return (
                    <tr key={exp.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-500">{new Date(exp.date).toLocaleDateString('en-MY')}</td>
                      
                      <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white max-w-[200px] truncate" title={exp.description}>
                        {isSystemPV ? (
                          <Link href={`/vouchers/${exp.id}`} className="hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                            {exp.description}
                          </Link>
                        ) : (
                          exp.description
                        )}
                      </td>
                      
                      <td className="py-4 px-4 text-sm font-bold text-red-600 dark:text-red-400">RM {Number(exp.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                      
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* BUTANG KIRI: VENDOR INVOICE */}
                          {exp.receipt_url ? (
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:scale-110 transition-transform" title="View Vendor Invoice">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </a>
                          ) : (
                            <div className="relative p-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center justify-center group" title="Quick Attach Vendor Invoice">
                              <input 
                                type="file" 
                                accept="image/*, application/pdf" 
                                onChange={(e) => handleQuickUpload(e, exp.id, 'receipt')} 
                                disabled={uploadingState?.id === exp.id} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                              />
                              {uploadingState?.id === exp.id && uploadingState?.type === 'receipt' ? (
                                <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              ) : (
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              )}
                            </div>
                          )}

                          {/* BUTANG KANAN: PAYMENT PROOF */}
                          {exp.payment_proof_url ? (
                            <a href={exp.payment_proof_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:scale-110 transition-transform" title="View Payment Proof">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </a>
                          ) : (
                            <div className="relative p-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 rounded-lg hover:bg-purple-50 hover:text-purple-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 transition-colors cursor-pointer flex items-center justify-center group" title="Quick Attach Payment Proof">
                              <input 
                                type="file" 
                                accept="image/*, application/pdf" 
                                onChange={(e) => handleQuickUpload(e, exp.id, 'proof')} 
                                disabled={uploadingState?.id === exp.id} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                              />
                              {uploadingState?.id === exp.id && uploadingState?.type === 'proof' ? (
                                <svg className="w-4 h-4 animate-spin text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              ) : (
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              )}
                            </div>
                          )}

                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isPaid ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'}`}>
                          {isPaid ? "Paid" : "Outstanding"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          
                          {isSystemPV && (
                            <Link href={`/vouchers/${exp.id}`} className="p-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 rounded-lg hover:scale-110 hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-all shadow-sm" title="View Generated Voucher">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                          )}
                          
                          <ExpenseAction expense={exp} onUpdate={fetchExpenses} />
                        </div>
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
    </div>
  );
}