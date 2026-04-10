"use client";

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClientAction({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteClient = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this client? This action cannot be undone.");
    if (!confirmDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (!error) {
      router.refresh();
    } else {
      console.error("Failed to delete client:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end">
      <button
        onClick={deleteClient}
        disabled={isDeleting}
        className="text-gray-600 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(248,113,113,0.3)] transition-all duration-300 active:scale-95 disabled:opacity-50"
        title="Delete Client"
      >
        {isDeleting ? (
          <span className="text-[10px] font-bold">...</span>
        ) : (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </div>
  );
}