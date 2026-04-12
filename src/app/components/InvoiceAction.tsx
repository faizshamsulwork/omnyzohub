"use client";

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Swal from 'sweetalert2'; 

export default function InvoiceAction({ invoice }: { invoice: any }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // 🔴 SAFETY CHECK: Kalau data invois belum loading, jangan buat apa-apa (elak skrin crash)
  if (!invoice) return null;

  // FUNGSI 1: TUKAR STATUS PAID / OUTSTANDING
  const toggleStatus = async () => {
    setIsProcessing(true);
    const newStatus = invoice?.status === 'paid' ? 'outstanding' : 'paid';
    const loadingToast = toast.loading(`Marking as ${newStatus}...`);

    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoice.id);

    if (!error) {
      toast.success(`Invoice marked as ${newStatus}`, { id: loadingToast });
      // 🔴 FIX: Paksa skrin update serta merta
      window.location.reload();
    } else {
      toast.error("Error updating status", { id: loadingToast });
    }
    setIsProcessing(false);
  };

  // FUNGSI 2: DELETE INVOICE DENGAN PASSWORD & AUDIT LOG
  const deleteInvoice = async () => {
    const { value: password } = await Swal.fire({
      title: 'Security Check',
      text: `Enter your login password to permanently delete ${invoice.invoice_no}`,
      input: 'password',
      inputPlaceholder: 'Enter your password',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Verify & Delete',
      background: '#111111',
      color: '#ffffff',
    });

    if (password) {
      setIsProcessing(true);
      const loadingToast = toast.loading("Verifying identity...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;

        if (!userEmail) throw new Error("No active session.");

        // Sahkan password
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password
        });

        if (authError) {
          toast.error("Security alert: Incorrect password!", { id: loadingToast });
          setIsProcessing(false);
          return;
        }

        // Masukkan rekod ke dalam Jadual Log Audit
        await supabase.from("audit_logs").insert([{
          action: "DELETE_INVOICE",
          details: `Deleted ${invoice.invoice_no} (Client: ${invoice.client_name}, Total: RM${invoice.amount})`,
          performed_by: userEmail
        }]);

        // Padam Invoice
        const { error: deleteError } = await supabase.from("invoices").delete().eq("id", invoice.id);
        
        if (deleteError) throw deleteError;

        toast.success("Invoice securely deleted.", { id: loadingToast });
        
        // 🔴 FIX: Paksa skrin buang invois dari senarai serta-merta lepas delete
        window.location.reload();

      } catch (err: any) {
        toast.error(`System Error: ${err.message}`, { id: loadingToast });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-end gap-3">
      
      {/* Butang Toggle Status */}
      <button 
        onClick={toggleStatus} 
        disabled={isProcessing} 
        className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95 disabled:opacity-50 ${
          invoice?.status === 'paid' 
            ? 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800' 
            : 'border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white'
        }`}
      >
        {isProcessing ? "..." : invoice?.status === 'paid' ? "MARK UNPAID" : "MARK PAID"}
      </button>

      {/* Butang View PDF */}
      <Link 
        href={`/invoice/${invoice.id}`} 
        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-90" 
        title="View PDF"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </Link>
      
      {/* Butang Delete */}
      <button 
        onClick={deleteInvoice} 
        disabled={isProcessing} 
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90" 
        title="Delete Invoice"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
      
    </div>
  );
}