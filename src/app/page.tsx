"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Link from "next/link";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Kenal pasti siapa yang login
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || "");

      // 2. Tarik data kewangan
      const [invRes, expRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false })
      ]);

      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const isSuperadmin = userEmail === "faiz@omnyzo.com";

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Dashboard...</div>;
  }

  // PENGIRAAN P&L
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const taxDeductibleExpenses = expenses.filter(exp => exp.category.includes('*')).reduce((sum, exp) => {
    if (exp.category.includes('Entertainment')) return sum + (Number(exp.amount) * 0.5);
    return sum + Number(exp.amount);
  }, 0);

  return (
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            {isSuperadmin ? "Omnyzo's financial health & tax status." : "Welcome to Omnyzo Agency Operating System."}
          </p>
        </header>

        {isSuperadmin ? (
          <>
            {/* KAD P&L FAIZ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-green-200 dark:border-green-900/30">
                <h3 className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-2">Total Revenue</h3>
                <p className="text-3xl font-black text-green-600 dark:text-green-400">RM {totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500 mt-1">From {paidInvoices.length} paid invoices</p>
              </div>
              <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-red-200 dark:border-red-900/30">
                <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-2">Total Expenses</h3>
                <p className="text-3xl font-black text-red-600 dark:text-red-400">RM {totalExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500 mt-1">Company operational costs</p>
              </div>
              <div className={`bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border ${netProfit >= 0 ? 'border-blue-200 dark:border-blue-900/30' : 'border-orange-200 dark:border-orange-900/30'}`}>
                <h3 className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${netProfit >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>Net Profit</h3>
                <p className={`text-3xl font-black ${netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>RM {netProfit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500 mt-1">Profit Margin: {profitMargin}%</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-100 p-8 rounded-[32px] shadow-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div>
                <h3 className="text-sm font-bold text-white dark:text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  LHDN Tax Optimization
                </h3>
                <p className="text-gray-400 dark:text-gray-600 text-sm">Estimated expenses that can be used to reduce your taxable income.</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white dark:text-black tracking-tighter">RM {taxDeductibleExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-yellow-400 mt-1 uppercase tracking-widest">Tax Deductible Value</p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-10 rounded-[32px] border border-gray-200 dark:border-gray-800 mb-12 text-center shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">Welcome back, Team.</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Focus on creating great work today! Use the quick actions below to manage daily operations for Omnyzo.</p>
          </div>
        )}

        <div className={`grid grid-cols-2 ${isSuperadmin ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
          <Link href="/new-invoice" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
            <span className="text-sm font-bold">New Invoice</span>
          </Link>
          <Link href="/new-quotation" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
            <span className="text-sm font-bold">New Quotation</span>
          </Link>
          
          {isSuperadmin && (
            <>
              <Link href="/new-expense" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                <span className="text-sm font-bold">Record Expense</span>
              </Link>
              <Link href="/expenses" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                <span className="text-sm font-bold">Tax Ledger</span>
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}