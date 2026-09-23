"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import QuotationAction from "../components/QuotationAction";
import type { Quotation } from "../lib/types";
import { formatCurrency, formatDateOnly, normalizeStatus } from "../lib/utils";

type QuotationRow = Pick<Quotation, "id" | "created_at" | "quote_no" | "client_name" | "date" | "total" | "status">;

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<QuotationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQuotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("quotations")
      .select("id,created_at,quote_no,client_name,date,total,status")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching quotations:", error);
    setQuotes((data as QuotationRow[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQuotes();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadQuotes]);

  const draftQuotes = quotes.filter((q) => normalizeStatus(q.status) === "draft");
  const approvedQuotes = quotes.filter((q) => normalizeStatus(q.status) === "approved");
  const totalQuotes = quotes.length;

  // Pipeline = Duit dari quote yang masih Draft
  const pipelineTotal = draftQuotes.reduce((sum, q) => sum + Number(q.total), 0);

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 selection:text-black relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">

        {/* HEADER YANG DAH DIKEMASKINI - CLEAN & MINIMALIST */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight transition-colors">Quotations</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg transition-colors">Send quotes, track approvals and pipeline.</p>
          </div>
          <Link href="/new-quotation" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 w-full md:w-auto">
            + Create Quotation
          </Link>
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total Quotes</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{totalQuotes}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-blue-200 dark:border-blue-900/30 transition-colors">
            <h3 className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2">Pipeline (Draft)</h3>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{formatCurrency(pipelineTotal)}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-[11px] font-bold text-green-500 uppercase tracking-wider mb-2">Approved</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{approvedQuotes.length}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-2">Draft / Sent</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{draftQuotes.length}</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl p-8 rounded-[32px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 min-h-[400px] transition-colors">
          {isLoading ? (
            <div className="flex justify-center py-20 text-gray-500 animate-pulse font-bold">Loading quotations...</div>
          ) : quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Quote No.</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Status</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-blue-600 dark:text-blue-400">{q.quote_no}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">{q.client_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDateOnly(q.date)}</td>
                      <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(q.total)}</td>
                      <td className="py-4 px-4 text-sm text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${normalizeStatus(q.status) === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <QuotationAction quote={q} onUpdate={loadQuotes} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center py-20 text-gray-500">No quotations found.</div>
          )}
        </div>

      </div>
    </div>
  );
}
