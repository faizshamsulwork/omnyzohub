"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Link from "next/link";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE UNTUK TAX PREDICTOR
  const [monthlySalary, setMonthlySalary] = useState<number>(8500);
  const [showTaxModal, setShowTaxModal] = useState(false);

  // PELEPASAN TERPERINCI (LHDN Defaults)
  const [reliefs, setReliefs] = useState({
    individu: 9000,
    kwsp: 4000,
    insurans_nyawa: 3000,
    gaya_hidup: 2500,
    perubatan: 0
  });
  
  // STATE KHAS UNTUK ANAK (Multiplier)
  const [bilanganAnak, setBilanganAnak] = useState<number>(2);

  const totalReliefs = Object.values(reliefs).reduce((a, b) => a + b, 0) + (bilanganAnak * 2000);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || "");

      const [invRes, expRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false })
      ]);

      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);

      const savedSalary = localStorage.getItem("omnyzo_monthly_salary");
      const savedReliefs = localStorage.getItem("omnyzo_tax_reliefs_v3");
      const savedAnak = localStorage.getItem("omnyzo_tax_anak");
      
      if (savedSalary) setMonthlySalary(Number(savedSalary));
      if (savedReliefs) setReliefs(JSON.parse(savedReliefs));
      if (savedAnak) setBilanganAnak(Number(savedAnak));

      setIsLoading(false);
    };

    fetchData();
  }, []);

  // AUTO-SAVE BILA KAU TUKAR NILAI
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("omnyzo_monthly_salary", monthlySalary.toString());
      localStorage.setItem("omnyzo_tax_reliefs_v3", JSON.stringify(reliefs));
      localStorage.setItem("omnyzo_tax_anak", bilanganAnak.toString());
    }
  }, [monthlySalary, reliefs, bilanganAnak, isLoading]);

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

  // LOGIK TAX PREDICTOR
  const annualSalary = monthlySalary * 12;
  const chargeableIncome = Math.max(0, annualSalary + netProfit - totalReliefs);

  let taxRate = 0;
  let nextBracketThreshold = 5000;
  let currentBracketBase = 0;

  if (chargeableIncome <= 5000) { taxRate = 0; nextBracketThreshold = 5000; currentBracketBase = 0; }
  else if (chargeableIncome <= 20000) { taxRate = 1; nextBracketThreshold = 20000; currentBracketBase = 5000; }
  else if (chargeableIncome <= 35000) { taxRate = 3; nextBracketThreshold = 35000; currentBracketBase = 20000; }
  else if (chargeableIncome <= 50000) { taxRate = 6; nextBracketThreshold = 50000; currentBracketBase = 35000; }
  else if (chargeableIncome <= 70000) { taxRate = 11; nextBracketThreshold = 70000; currentBracketBase = 50000; }
  else if (chargeableIncome <= 100000) { taxRate = 19; nextBracketThreshold = 100000; currentBracketBase = 70000; }
  else if (chargeableIncome <= 400000) { taxRate = 25; nextBracketThreshold = 400000; currentBracketBase = 100000; }
  else if (chargeableIncome <= 600000) { taxRate = 26; nextBracketThreshold = 600000; currentBracketBase = 400000; }
  else { taxRate = 28; nextBracketThreshold = 2000000; currentBracketBase = 600000; }

  const progressPercent = chargeableIncome >= 600000 ? 100 : ((chargeableIncome - currentBracketBase) / (nextBracketThreshold - currentBracketBase)) * 100;

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

            <div className="bg-gradient-to-br from-gray-900 to-black dark:from-[#111] dark:to-[#0a0a0a] p-8 rounded-[32px] shadow-2xl mb-12 border border-gray-800 animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-64 h-64 bg-${taxRate >= 25 ? 'red' : taxRate >= 11 ? 'orange' : 'blue'}-500 opacity-10 blur-[100px] rounded-full pointer-events-none`}></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Live Tax Bracket Predictor
                  </h3>
                  <p className="text-gray-400 text-xs">Total Reliefs: RM {totalReliefs.toLocaleString('en-MY')} | Est. based on Salary + Omnyzo Profit.</p>
                </div>
                <button onClick={() => setShowTaxModal(true)} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className={`text-4xl font-black ${taxRate >= 25 ? 'text-red-400' : taxRate >= 11 ? 'text-orange-400' : 'text-green-400'}`}>
                      {taxRate}%
                    </span>
                    <span className="text-gray-400 text-sm ml-2 font-medium">Current Bracket</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">RM {chargeableIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest">Chargeable Income</p>
                  </div>
                </div>

                <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden border border-gray-700">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ease-out ${taxRate >= 25 ? 'bg-red-500' : taxRate >= 11 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-[10px] text-gray-500 font-bold tracking-wider">
                  <span>RM {currentBracketBase.toLocaleString('en-MY')}</span>
                  <span>Next Bracket: RM {nextBracketThreshold.toLocaleString('en-MY')}</span>
                </div>
              </div>
            </div>

            {/* MODAL FORM UNTUK TAX RELIEFS DENGAN Z-INDEX PALING TINGGI */}
            {showTaxModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
                <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-[32px] w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[80vh] md:max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Tax Reliefs Form</h2>
                    <button onClick={() => setShowTaxModal(false)} className="text-gray-500 hover:text-black dark:hover:text-white">✕</button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                      <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Monthly Salary (Adtech)</label>
                      <p className="text-[9px] text-gray-500 mb-2">Gaji kasar bulanan dari penggajian rasmi.</p>
                      <input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">Claimable Reliefs (Yearly)</p>
                      
                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Individu & Tanggungan</label>
                        <p className="text-[9px] text-gray-500 mb-2">Pelepasan automatik. (Maksimum RM 9,000)</p>
                        <input type="number" value={reliefs.individu} onChange={(e) => setReliefs({...reliefs, individu: Number(e.target.value)})} className="w-full bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-yellow-400" />
                      </div>

                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">KWSP (EPF)</label>
                        <p className="text-[9px] text-gray-500 mb-2">Caruman wajib/sukarela. (Maksimum RM 4,000)</p>
                        <input type="number" value={reliefs.kwsp} onChange={(e) => setReliefs({...reliefs, kwsp: Number(e.target.value)})} className="w-full bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-yellow-400" />
                      </div>

                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Insurans Nyawa</label>
                        <p className="text-[9px] text-gray-500 mb-2">Premium insurans nyawa. (Maksimum RM 3,000)</p>
                        <input type="number" value={reliefs.insurans_nyawa} onChange={(e) => setReliefs({...reliefs, insurans_nyawa: Number(e.target.value)})} className="w-full bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-yellow-400" />
                      </div>

                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Gaya Hidup (Lifestyle)</label>
                        <p className="text-[9px] text-gray-500 mb-2">Buku, PC, sukan, internet. (Maksimum RM 2,500)</p>
                        <input type="number" value={reliefs.gaya_hidup} onChange={(e) => setReliefs({...reliefs, gaya_hidup: Number(e.target.value)})} className="w-full bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-yellow-400" />
                      </div>

                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Perubatan</label>
                        <p className="text-[9px] text-gray-500 mb-2">Penyakit serius & check-up. (Maksimum RM 10,000)</p>
                        <input type="number" value={reliefs.perubatan} onChange={(e) => setReliefs({...reliefs, perubatan: Number(e.target.value)})} className="w-full bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-yellow-400" />
                      </div>

                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Bilangan Anak (Bawah 18 Tahun)</label>
                        <p className="text-[9px] text-gray-500 mb-2">Pelepasan RM 2,000 untuk setiap anak.</p>
                        <div className="flex items-center gap-4">
                          <input type="number" value={bilanganAnak} onChange={(e) => setBilanganAnak(Number(e.target.value))} className="w-24 bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 dark:text-white text-sm focus:outline-none focus:border-yellow-400" />
                          <span className="text-sm font-bold text-gray-500">= RM {(bilanganAnak * 2000).toLocaleString('en-MY')}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Reliefs</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">RM {totalReliefs.toLocaleString('en-MY')}</p>
                    </div>
                    <button onClick={() => setShowTaxModal(false)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all">
                      Save & Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-10 rounded-[32px] border border-gray-200 dark:border-gray-800 mb-12 text-center shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">Welcome back, Team.</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Focus on creating great work today!</p>
          </div>
        )}

        <div className={`grid grid-cols-2 ${isSuperadmin ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-2'} gap-4`}>
          <Link href="/new-invoice" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
            <span className="text-sm font-bold text-center">New Invoice</span>
          </Link>
          <Link href="/new-quotation" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
            <span className="text-sm font-bold text-center">New Quotation</span>
          </Link>
          
          {isSuperadmin && (
            <>
              <Link href="/new-expense" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                <span className="text-sm font-bold text-center">Record Expense</span>
              </Link>
              <Link href="/expenses" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                <span className="text-sm font-bold text-center">Tax Ledger</span>
              </Link>
              <Link href="/assets" className="bg-white/80 dark:bg-[#111111]/80 p-6 rounded-[24px] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                <span className="text-sm font-bold text-center">Company Assets</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}