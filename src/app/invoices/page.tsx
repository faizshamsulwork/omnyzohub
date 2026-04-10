import Link from "next/link";
import { supabase } from "../lib/supabase";
import InvoiceAction from "../components/InvoiceAction";
import { motion } from "framer-motion";

export const revalidate = 0;

export default async function InvoicesPage() {
  const { data: invoices } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });

  const totalInvoices = invoices?.length || 0;
  const outstandingInvoices = invoices?.filter(inv => inv.status === 'outstanding') || [];
  const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
  
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Manage billings, payments and revenue status.</p>
          </div>
         
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-gray-200 dark:border-gray-800">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Invoices</h3>
            <p className="text-3xl font-black">{totalInvoices}</p>
          </div>
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-orange-200 dark:border-orange-900/30">
            <h3 className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-2">Outstanding Invoices</h3>
            <p className="text-3xl font-black text-orange-600 dark:text-orange-400">RM {totalOutstanding.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1">{outstandingInvoices.length} invoices pending payment</p>
          </div>
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-green-200 dark:border-green-900/30">
            <h3 className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-2">Total Revenue (Paid)</h3>
            <p className="text-3xl font-black text-green-600 dark:text-green-400">RM {totalPaid.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1">Based on {paidInvoices.length} cleared payments</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 min-h-[400px]">
          {invoices && invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Inv No.</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Status</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">{inv.invoice_no || "-"}</td>
                      <td className="py-4 px-4 text-sm font-semibold">{inv.client_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString('en-MY')}</td>
                      <td className="py-4 px-4 text-sm font-bold">RM {Number(inv.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-sm text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right"><InvoiceAction id={inv.id} status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              No invoices generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}