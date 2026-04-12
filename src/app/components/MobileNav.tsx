"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import LogoutButton from "./LogoutButton";

export default function MobileNav() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    getUser();
  }, []);

  if (pathname === "/login") return null;
  const isSuperadmin = userEmail === "faiz@omnyzo.com";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-2xl border-t border-gray-200 dark:border-gray-800 z-[9999] pb-6 pt-2 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <nav className="flex items-center justify-around">
        <Link href="/" className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${pathname === '/' ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[9px] font-bold">Home</span>
        </Link>
        <Link href="/quotations" className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${pathname.includes('/quotations') ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[9px] font-bold">Quotes</span>
        </Link>
        <Link href="/invoices" className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${pathname.includes('/invoices') ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          <span className="text-[9px] font-bold">Invoices</span>
        </Link>
        
        {isSuperadmin && (
          <Link href="/expenses" className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${pathname.includes('/expenses') ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="text-[9px] font-bold">Expenses</span>
          </Link>
        )}
        
        <div className="p-2 rounded-xl flex flex-col items-center gap-1">
          <LogoutButton />
          <span className="text-[9px] font-bold text-gray-500">Exit</span>
        </div>
      </nav>
    </div>
  );
}