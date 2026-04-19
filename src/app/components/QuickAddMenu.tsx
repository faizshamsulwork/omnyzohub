"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function QuickAddMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false); // State baru untuk tab menyorok
  const menuRef = useRef<HTMLDivElement>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Semak siapa yang login untuk filter menu
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    getUser();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // 🔴 SMART AUTO-HIDE: Kesan bila user klik input form (tengah menaip)
    const handleFocusIn = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setIsOpen(false);
        setIsMinimized(true); // Automatik sorokkan butang
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusin", handleFocusIn); // Dengar aktiviti keyboard/form

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  // MATIKAN BUTANG JIKA BERADA DI MUKA SURAT LOGIN
  if (pathname === "/login") return null;

  const isSuperadmin = userEmail === "faiz@omnyzo.com";

  // SENARAI MENU ASAS
  const menuItems = [
    { label: "New Quotation", href: "/new-quotation", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { label: "New Invoice", href: "/new-invoice", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
  ];

  // TAMBAH MENU KHAS JIKA SUPERADMIN (FAIZ)
  if (isSuperadmin) {
    menuItems.push(
      { label: "Record Expense", href: "/new-expense", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
      { label: "Register Asset", href: "/assets", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" }
    );
  }

  // FUNGSI 3-STATE KLIK
  const handleFabClick = () => {
    if (isMinimized) {
      setIsMinimized(false); // Klik pertama: Kembalikan butang biru
    } else {
      setIsOpen(!isOpen); // Klik kedua: Buka menu pilihan
    }
  };

  return (
    <>
      {/* OVERLAY GELAP BILA MENU DIBUKA (Fokus) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-[90] print:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div ref={menuRef} className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] print:hidden">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8, transformOrigin: "bottom right" }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-20 right-0 w-64 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-[28px] shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden"
            >
              <div className="p-3 space-y-1">
                {menuItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 px-4 py-4 text-sm font-bold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all active:scale-95 group"
                  >
                    <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <svg className={`w-5 h-5 ${item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                    </div>
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BUTANG UTAMA (DYNAMIC STATE) */}
        <motion.button
          whileHover={{ scale: isMinimized ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFabClick}
          className={`flex items-center justify-center transition-all duration-300 ease-in-out relative z-10 ${
            isMinimized
              ? "w-8 h-14 bg-gray-400/40 dark:bg-gray-700/40 backdrop-blur-md text-gray-700 dark:text-gray-300 rounded-l-2xl rounded-r-none translate-x-4 shadow-sm border border-white/20 dark:border-white/5 hover:-translate-x-1"
              : "w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.4)]"
          }`}
        >
          {isMinimized ? (
            // Ikon anak panah halus masa menyorok
            <svg className="w-4 h-4 -ml-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          ) : (
            // Ikon + masa normal
            <motion.svg
              animate={{ rotate: isOpen ? 135 : 0 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
              className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </motion.svg>
          )}
        </motion.button>
      </div>
    </>
  );
}