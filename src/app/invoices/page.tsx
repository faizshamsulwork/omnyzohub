"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import InvoiceAction from "../components/InvoiceAction";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setInvoices(data);
    }
    setIsLoading(false);
  };

  // Fungsi untuk filter invois berdasarkan carian (Nama Client atau No Invois)
  const filteredInvoices = invoices.filter((inv) =>
    inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 md:p-12 relative transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER & NEW INVOICE BUTTON */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base font-medium">Manage your billing and track payments.</p>
          </div>
          <Link 
            href="/new-invoice" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Create Invoice
          </Link>
        </header>

        {/* SEARCH BAR */}
        <div className="mb-8">
          <div className="relative max-w-md">
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
        </div>

        {/* INVOICE LIST */}
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
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 bg-gray-50/50 dark:bg-black/20">
                    <th className="p-5 font-bold">Invoice Info</th>
                    <th className="p-5 font-bold hidden md:table-cell">Date</th>
                    <th className="p-5 font-bold text-right">Amount</th>
                    <th className="p-5 font-bold text-center">Status</th>
                    <th className="p-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                      
                      {/* INFO KOLUM */}
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white">{inv.invoice_no}</span>
                          <span className="text-sm text-gray-500 truncate max-w-[150px] md:max-w-xs">{inv.client_name}</span>
                        </div>
                      </td>

                      {/* DATE KOLUM (Hidden on small mobile) */}
                      <td className="p-5 hidden md:table-cell text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {new Date(inv.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* AMOUNT KOLUM */}
                      <td className="p-5 text-right font-black text-gray-900 dark:text-white">
                        RM {Number(inv.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>

                      {/* STATUS KOLUM */}
                      <td className="p-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          inv.status === 'paid' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {inv.status}
                        </span>
                      </td>

                      {/* ACTIONS KOLUM (INI YANG KITA BETULKAN) */}
                      <td className="p-5">
                        <InvoiceAction invoice={inv} />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}