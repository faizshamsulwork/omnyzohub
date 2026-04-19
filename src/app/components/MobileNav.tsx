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
  
  // States
  const [isDark, setIsDark] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // State untuk Bottom Sheet

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    getUser();

    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  if (pathname === "/login") return null;
  const isSuperadmin = userEmail === "faiz@omnyzo.com";

  const handleLogoutAction = async () => {
    if (!confirmExit) {
      setConfirmExit(true);
      setTimeout(() => setConfirmExit(false), 3000); 
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
    } else {
      toast.error("Error logging out.");
    }
  };

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.includes(path);
  };

  return (
    <>
      {/* 1. OVERLAY GELAP BILA MENU DIBUKA */}
      {showMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990] transition-opacity animate-in fade-in"
          onClick={() => { setShowMenu(false); setConfirmExit(false); }}
        />
      )}

      {/* 2. BOTTOM SHEET MENU (Meluncur naik dari bawah) */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] z-[9995] rounded-t-[32px] p-6 pb-12 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-out ${showMenu ? 'translate-y-0' : 'translate-y-full'}`}>
        
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
        
        <div className="mb-6 px-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
          <p className="font-bold text-gray-900 dark:text-white truncate">{userEmail || "Loading..."}</p>
        </div>

        <div className="space-y-2 mb-6 border-y border-gray-100 dark:border-gray-800 py-4">
          <Link href="/contacts" onClick={() => setShowMenu(false)} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:scale-95">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
            <span className="font-bold text-gray-700 dark:text-gray-200">Contacts</span>
          </Link>
          
          <Link href="/assets" onClick={() => setShowMenu(false)} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:scale-95">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
            <span className="font-bold text-gray-700 dark:text-gray-200">Company Assets</span>
          </Link>
        </div>

        <div className="flex gap-4">
          <button onClick={toggleTheme} className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 active:scale-95 transition-all">
            {isDark ? <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> : <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            <span className="text-[10px] font-bold text-gray-500">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button onClick={handleLogoutAction} className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl active:scale-95 transition-all ${confirmExit ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="text-[10px] font-bold">{confirmExit ? 'Tap to Confirm' : 'Log Out'}</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN BOTTOM NAVIGATION BAR (MAX 5 ITEMS) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-800/50 z-[9980] pb-8 pt-3 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
        <nav className="flex items-center justify-around w-full max-w-md mx-auto relative">
          
          <Link href="/" onClick={() => setShowMenu(false)} className={`flex flex-col items-center justify-center gap-1.5 transition-all w-16 ${isActive('/') ? 'text-black dark:text-white scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            <svg className="w-6 h-6" fill={isActive('/') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/') ? "0" : "2"} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className={`text-[10px] ${isActive('/') ? 'font-black' : 'font-medium'}`}>Home</span>
          </Link>

          <Link href="/quotations" onClick={() => setShowMenu(false)} className={`flex flex-col items-center justify-center gap-1.5 transition-all w-16 ${isActive('/quotations') ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            <svg className="w-6 h-6" fill={isActive('/quotations') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/quotations') ? "0" : "2"} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className={`text-[10px] ${isActive('/quotations') ? 'font-black' : 'font-medium'}`}>Quotes</span>
          </Link>

          <Link href="/invoices" onClick={() => setShowMenu(false)} className={`flex flex-col items-center justify-center gap-1.5 transition-all w-16 ${isActive('/invoices') ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            <svg className="w-6 h-6" fill={isActive('/invoices') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/invoices') ? "0" : "2"} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
            <span className={`text-[10px] ${isActive('/invoices') ? 'font-black' : 'font-medium'}`}>Invoices</span>
          </Link>

          {isSuperadmin && (
            <Link href="/expenses" onClick={() => setShowMenu(false)} className={`flex flex-col items-center justify-center gap-1.5 transition-all w-16 ${isActive('/expenses') ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <svg className="w-6 h-6" fill={isActive('/expenses') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/expenses') ? "0" : "2"} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              <span className={`text-[10px] ${isActive('/expenses') ? 'font-black' : 'font-medium'}`}>Expenses</span>
            </Link>
          )}

          {/* MENU BUTTON */}
          <button onClick={() => { setShowMenu(!showMenu); setConfirmExit(false); }} className={`flex flex-col items-center justify-center gap-1.5 transition-all w-16 ${showMenu ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="text-[10px] font-medium">Menu</span>
          </button>

        </nav>
      </div>
    </>
  );
}