"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";

export default function Sidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Semak siapa yang tengah login
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    getUser();

    // Dengar kalau ada perubahan user
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  // JIKA DI MUKA SURAT LOGIN, JANGAN TUNJUK SIDEBAR LANGSUNG
  if (pathname === "/login") return null;

  // TENTUKAN IDENTITI
  const isSuperadmin = userEmail === "faiz@omnyzo.com";
  
  const displayName = isSuperadmin ? "Faiz" : "Amirun";
  const roleName = isSuperadmin ? "Creative Lead" : "Admin";
  const initials = isSuperadmin ? "FZ" : "AM";

  return (
    <aside className="w-64 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800/80 flex-col hidden md:flex z-10 transition-colors duration-500 print:hidden">
      
      {/* BAHAGIAN LOGO (DIBESARKAN & AUTO-PUTIH) */}
      <div className="pt-10 pb-6 px-8 mb-2 flex items-center justify-start">
        <img 
          src="/logo.png" 
          alt="Omnyzo Logo" 
          className="h-20 w-auto object-contain dark:invert dark:brightness-200 transition-all duration-500 hover:scale-105 drop-shadow-sm" 
        />
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-all active:scale-95 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          Dashboard
        </Link>
        <Link href="/quotations" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-all active:scale-95 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Quotations
        </Link>
        <Link href="/invoices" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-all active:scale-95 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
          Invoices
        </Link>
        <Link href="/contacts" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-all active:scale-95 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Contacts
        </Link>
        
        {/* AMIRUN TAK BOLEH TENGOK MENU EXPENSES & ASSETS */}
        {isSuperadmin && (
          <>
            <Link href="/expenses" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-all active:scale-95 group">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Expenses
            </Link>
            <Link href="/assets" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-all active:scale-95 group">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Assets
            </Link>
          </>
        )}
        <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-800/80"><ThemeToggle /></div>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800/80 mt-auto">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center font-bold text-xs shadow-inner">{initials}</div>
            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{displayName}</span><span className="text-[11px] font-medium text-gray-500">{roleName}</span></div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}