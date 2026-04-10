"use client";

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function InvoiceAction({ id, status, invoice_no }: { id: string; status: string; invoice_no?: string }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const markAsPaid = async () => {
    if (!window.confirm("Confirm payment received for this invoice?")) return;
    setIsUpdating(true);
    const toastId = toast.loading("Updating status...");
    
    const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
    if (!error) {
      toast.success("Invoice marked as PAID. Official Receipt generated.", { id: toastId });
      router.refresh();
    } else {
      toast.error("Failed to update status.", { id: toastId });
    }
    setIsUpdating(false);
  };

  const deleteInvoice = async () => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (!error) {
      toast.success("Invoice deleted.");
      router.refresh();
    } else {
      toast.error("Failed to delete invoice.");
    }
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center justify-end gap-3">
      
      {/* BUTANG MARK PAID */}
      {status === "outstanding" && (
        <button onClick={markAsPaid} disabled={isUpdating} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-gray-600 text-gray-500 hover:bg-green-50 hover:text-green-600 hover:border-green-600 transition-all active:scale-95 disabled:opacity-50" title="Mark as Paid">
          {isUpdating ? "..." : "MARK PAID"}
        </button>
      )}

      {/* BUTANG VIEW INVOICE (MATA) */}
      <Link href={`/invoice/${id}`} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-95" title="View Invoice">
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </Link>

      {/* BUTANG VIEW OFFICIAL RECEIPT (KERTAS CHECK) - HANYA KELUAR BILA PAID */}
      {status === "paid" && (
        <Link href={`/receipt/${id}`} className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all active:scale-95" title="View Official Receipt">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </Link>
      )}
      
      {/* BUTANG DELETE (TONG SAMPAH) */}
      <button onClick={deleteInvoice} disabled={isDeleting} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-95" title="Delete">
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}