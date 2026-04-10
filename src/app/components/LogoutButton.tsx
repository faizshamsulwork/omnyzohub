"use client";

import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export default function LogoutButton() {
  const handleLogout = async () => {
    const toastId = toast.loading("Logging out...");
    
    // Matikan session kat Supabase
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      toast.success("Logged out successfully.", { id: toastId });
      // HARD REDIRECT UNTUK HALANG "FLASH" NAMA AMIRUN DAN RESET MEMORI BROWSER
      window.location.href = "/login";
    } else {
      toast.error("Error logging out.", { id: toastId });
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all active:scale-90"
      title="Log Out"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
    </button>
  );
}