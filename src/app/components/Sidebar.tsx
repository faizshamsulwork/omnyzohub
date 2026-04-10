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

  // TENTUKAN IDENTITI (Tukar emel ni kalau emel kau ejaan lain)
  const isSuperadmin = userEmail === "faiz@omnyzo.com";
  
  const displayName = isSuperadmin ? "Faiz" : "Amirun";
  const roleName = isSuperadmin ? "Creative Lead" : "Admin";
  const initials = isSuperadmin ? "FZ" : "AM";

  return (
    <aside className="w-64 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 flex-col hidden md:flex z-10 transition-colors duration-500 print:hidden">
      <div className="p-8 mb-2">
        <img src="/logo.png" alt="Omnyzo Logo" className="h-12 object-contain" />
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/30 hover:text-black dark:hover:text-white transition-all active:scale-95">Dashboard</Link>
        <Link href="/quotations" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/30 hover:text-black dark:hover:text-white transition-all active:scale-95">Quotations</Link>
        <Link href="/invoices" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/30 hover:text-black dark:hover:text-white transition-all active:scale-95">Invoices</Link>
        <Link href="/contacts" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/30 hover:text-black dark:hover:text-white transition-all active:scale-95">Contacts</Link>
        
        {/* AMIRUN TAK BOLEH TENGOK MENU EXPENSES */}
        {isSuperadmin && (
          <Link href="/expenses" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/30 hover:text-black dark:hover:text-white transition-all active:scale-95">Expenses</Link>
        )}
        <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-800"><ThemeToggle /></div>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center font-bold text-xs">{initials}</div>
            <div className="flex flex-col"><span className="text-sm font-semibold">{displayName}</span><span className="text-[11px] font-medium text-gray-500">{roleName}</span></div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}