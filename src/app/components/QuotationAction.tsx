"use client";

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Swal from 'sweetalert2'; 

export default function QuotationAction({ quote }: { quote: any }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!quote) return null;

  const convertToInvoice = async () => {
    if (!window.confirm(`Convert ${quote.quote_no} to an official invoice?`)) return;
    setIsProcessing(true);
    const loadingToast = toast.loading("Generating premium itemized invoice...");

    try {
      const today = new Date();
      const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
      const prefix = `${dateStr}-SV`;

      const { data: lastInvoice } = await supabase.from("invoices").select("invoice_no").like("invoice_no", `${prefix}%`).order("created_at", { ascending: false }).limit(1);

      let nextInvNo = `${prefix}01`;
      if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].invoice_no) {
        const parts = lastInvoice[0].invoice_no.split('-SV');
        const lastNum = parseInt(parts[1]);
        nextInvNo = `${prefix}${String(isNaN(lastNum) ? 1 : lastNum + 1).padStart(2, '0')}`;
      }

      // Default Credit Term untuk converted invoice = 14 Days
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const formattedDueDate = dueDate.toISOString().split('T')[0];

      // 🔴 MAGIK BERLAKU DI SINI: Angkut semua detail masuk Invois!
      const { error: invError } = await supabase.from("invoices").insert([{
        invoice_no: nextInvNo, 
        client_name: quote.client_name, 
        client_pic: quote.client_pic,
        client_address: quote.client_address,
        client_phone: quote.client_phone,
        client_email: quote.client_email,
        description: `Converted from Quotation ${quote.quote_no}`, 
        amount: quote.total, 
        items: quote.items,          // Pindah Items
        subtotal: quote.subtotal,    // Pindah Subtotal
        discount: quote.discount,    // Pindah Discount
        tax_amount: quote.tax_amount,// Pindah Tax
        due_date: formattedDueDate,
        status: "outstanding",
        terms: "1. Unless specified, Agency Fee is payable within 14 days from invoice date.\n2. The Agency reserves the right to suspend any Services in the event of delay in payment.\n3. Please indicate the invoice number as reference when transferring the funds.\n4. Payment advice should be sent to billings@omnyzo.com."
      }]);

      if (invError) throw invError;
      await supabase.from("quotations").update({ status: "Approved" }).eq("id", quote.id);
      
      toast.success(`Success! Itemized Invoice ${nextInvNo} created.`, { id: loadingToast });
      // Paksa refresh supaya status bertukar serta merta
      window.location.reload(); 
    } catch (err: any) {
      toast.error(`Failed to convert: ${err.message}`, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const duplicateQuote = async () => {
    if (!window.confirm(`Duplicate this quotation? A new draft will be created.`)) return;
    setIsProcessing(true);
    const loadingToast = toast.loading("Duplicating quotation...");

    try {
      const today = new Date();
      const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
      const prefix = `QU${dateStr}-`;

      const { data: lastQuote } = await supabase.from("quotations").select("quote_no").like("quote_no", `${prefix}%`).order("created_at", { ascending: false }).limit(1);

      let nextQuoteNo = `${prefix}001`;
      if (lastQuote && lastQuote.length > 0 && lastQuote[0].quote_no) {
        const lastNum = parseInt(lastQuote[0].quote_no.split('-')[1]);
        nextQuoteNo = `${prefix}${String(isNaN(lastNum) ? 1 : lastNum + 1).padStart(3, '0')}`;
      }

      const newQuoteData = {
        quote_no: nextQuoteNo,
        client_name: quote.client_name,
        client_pic: quote.client_pic,
        client_address: quote.client_address,
        client_phone: quote.client_phone,
        client_email: quote.client_email,
        date: new Date().toISOString().split('T')[0],
        valid_until: quote.valid_until,
        items: quote.items,
        subtotal: quote.subtotal,
        discount: quote.discount,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: `Revision of ${quote.quote_no}\n${quote.notes || ''}`,
        terms: quote.terms,
        status: "Draft"
      };

      const { error } = await supabase.from("quotations").insert([newQuoteData]);
      if (error) throw error;

      toast.success(`Duplicated successfully as ${nextQuoteNo}`, { id: loadingToast });
      window.location.reload();
    } catch (err: any) {
      toast.error(`Error duplicating: ${err.message}`, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteQuote = async () => {
    const { value: password } = await Swal.fire({
      title: 'Security Check',
      text: `Enter your login password to permanently delete ${quote.quote_no}`,
      input: 'password',
      inputPlaceholder: 'Enter your password',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Verify & Delete',
      background: '#111111',
      color: '#ffffff'
    });

    if (password) {
      setIsProcessing(true);
      const loadingToast = toast.loading("Verifying identity...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;

        if (!userEmail) throw new Error("No active session.");

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password
        });

        if (authError) {
          toast.error("Security alert: Incorrect password!", { id: loadingToast });
          setIsProcessing(false);
          return;
        }

        await supabase.from("audit_logs").insert([{
          action: "DELETE_QUOTATION",
          details: `Deleted ${quote.quote_no} (Client: ${quote.client_name}, Total: RM${quote.total})`,
          performed_by: userEmail
        }]);

        const { error: deleteError } = await supabase.from("quotations").delete().eq("id", quote.id);
        if (deleteError) throw deleteError;

        toast.success("Quotation securely deleted.", { id: loadingToast });
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
      {quote.status !== "Approved" && (
        <button onClick={convertToInvoice} disabled={isProcessing} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all active:scale-95 disabled:opacity-50">
          {isProcessing ? "PROCESSING..." : "CONVERT"}
        </button>
      )}

      <button onClick={duplicateQuote} disabled={isProcessing} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all active:scale-95" title="Duplicate Quotation">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
      </button>

      <Link href={`/quotation/${quote.id}`} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-90" title="View PDF">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </Link>
      
      <button onClick={deleteQuote} disabled={isProcessing} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90" title="Delete">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}