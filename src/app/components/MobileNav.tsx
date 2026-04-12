"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
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

  // FUNGSI LOG KELUAR NATIVE (Tak guna komponen luar supaya design tak pecah)
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
    } else {
      toast.error("Error logging out.");
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.includes(path);
  };

  return (
    // 🔴 REKAAN APPLE-STYLE GLASSMORPHISM 
    // pb-8 sangat penting untuk bagi ruang pada garis 'swipe' iPhone kat bawah skrin
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/85 dark:bg-[#111111]/85 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-800/50 z-[9999] pb-8 pt-3 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
      
      <nav className="flex items-center justify-between px-1">
        
        {/* TAB 1: HOME */}
        <Link href="/" className={`flex flex-col items-center gap-1.5 transition-all w-[16%] ${isActive('/') ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        {/* TAB 2: QUOTES */}
        <Link href="/quotations" className={`flex flex-col items-center gap-1.5 transition-all w-[16%] ${isActive('/quotations') ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[10px] font-bold">Quotes</span>
        </Link>

        {/* TAB 3: INVOICES */}
        <Link href="/invoices" className={`flex flex-col items-center gap-1.5 transition-all w-[16%] ${isActive('/invoices') ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
          <span className="text-[10px] font-bold">Invoices</span>
        </Link>

        {/* TAB 4: CONTACTS (Baru ditambah) */}
        <Link href="/contacts" className={`flex flex-col items-center gap-1.5 transition-all w-[16%] ${isActive('/contacts') ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <span className="text-[10px] font-bold">Contacts</span>
        </Link>
        
        {/* TAB 5: EXPENSES (Hanya untuk Admin) */}
        {isSuperadmin && (
          <Link href="/expenses" className={`flex flex-col items-center gap-1.5 transition-all w-[16%] ${isActive('/expenses') ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <span className="text-[10px] font-bold">Expenses</span>
          </Link>
        )}
        
        {/* TAB 6: EXIT / LOGOUT */}
        <button onClick={handleLogout} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-red-500 transition-all w-[16%] active:scale-95">
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span className="text-[10px] font-bold">Exit</span>
        </button>

      </nav>
    </div>
  );
}