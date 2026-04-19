"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import PrintButton from "../../components/PrintButton";

export default function InvoiceViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiptMode, setIsReceiptMode] = useState(false); // STATE BARU UNTUK MOD RESIT

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) return;
      setTimeout(async () => {
        const { data: invData, error: invError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();
        
        if (invError) console.error("Error fetching invoice:", invError);
        setInvoice(invData);
        setIsLoading(false);
      }, 500);
    };
    fetchInvoice();
  }, [invoiceId]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading Official Document...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl">Invoice not found.</div>;

  const formatAddress = (address: string) => {
    if (!address) return null;
    const match = address.match(/(.*?),\s*(\d{5}.*)/);
    if (match) {
      return (
        <>
          <span className="block mb-0.5">{match[1]},</span>
          <span className="block">{match[2]}</span>
        </>
      );
    }
    return <span className="block">{address}</span>;
  };

  // NAMA FAIL PDF BERGANTUNG PADA MOD
  const documentTitle = isReceiptMode ? `Receipt ${invoice.invoice_no}` : `Invoice ${invoice.invoice_no}`;
  const pdfFilename = isReceiptMode ? `${invoice.invoice_no}_Receipt.pdf` : `${invoice.invoice_no}_Invoice.pdf`;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0A0A0A] py-8 px-2 md:px-8 pb-32 transition-colors duration-300">
      
      {/* ACTION BAR (NON-PRINTABLE) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/invoices" className="text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-sm transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </Link>
        
        <div className="flex items-center gap-3">
          {/* BUTANG GENERATE RECEIPT (HANYA KELUAR KALAU PAID) */}
          {invoice.status === 'paid' && (
            <button
              onClick={() => setIsReceiptMode(!isReceiptMode)}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                isReceiptMode 
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400'
              }`}
            >
              {isReceiptMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View as Invoice
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Generate Receipt
                </>
              )}
            </button>
          )}
          
          <PrintButton documentName={documentTitle} targetId="invoice-document" filename={pdfFilename} />
        </div>
      </div>

      <div className="overflow-x-auto w-full pb-8 scrollbar-hide flex justify-center">
        <div className="shadow-2xl bg-white transition-all duration-500">
          <div id="invoice-document" className="w-[210mm] bg-[#ffffff] relative box-border font-sans flex flex-col h-auto pb-10 overflow-hidden">
            
            {/* WATERMARK PAID (HANYA MUNCUL DALAM MOD RESIT) */}
            {isReceiptMode && (
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.04] pointer-events-none select-none z-0 flex flex-col items-center justify-center">
                <span className="text-[140px] font-black text-green-600 uppercase border-[12px] border-green-600 px-12 py-4 rounded-3xl tracking-widest">PAID</span>
              </div>
            )}

            <div className="p-10 md:p-[50px] text-[#000000] flex-grow flex flex-col relative z-10">
              
              {/* HEADER */}
              <div className="flex justify-between items-start mb-12 border-b-2 border-[#F3F4F6] pb-8 avoid-break">
                <div className="w-1/2">
                  <img src="/logo.png" alt="Omnyzo" className="h-16 mb-2 object-contain" />
                  <h1 className="text-[14px] font-black tracking-widest text-[#000000] uppercase mb-1">Omnyzo Agency</h1>
                </div>
                <div className="w-1/2 text-right">
                  {/* TAJUK DINAMIK BERGANTUNG PADA MOD */}
                  <h2 className="text-[32px] font-black tracking-tighter text-[#000000] mb-4 uppercase">
                    {isReceiptMode ? "Official Receipt" : "Invoice"}
                  </h2>
                  
                  <table className="w-full text-[11px] text-[#374151] ml-auto">
                    <tbody>
                      <tr>
                        <td className="py-1 font-bold text-right pr-4 uppercase tracking-wider w-[60%]">
                          {isReceiptMode ? "Receipt No:" : "Invoice No:"}
                        </td>
                        <td className="py-1 font-bold text-[#000000] text-right">{invoice.invoice_no}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-right pr-4 uppercase tracking-wider">Date:</td>
                        <td className="py-1 text-right">{new Date(invoice.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </tr>
                      {/* JANGAN TUNJUK DUE DATE KALAU INI ADALAH RESIT */}
                      {invoice.due_date && !isReceiptMode && (
                        <tr><td className="py-1 font-bold text-right pr-4 uppercase tracking-wider text-[#EF4444]">Due Date:</td><td className="py-1 text-right font-bold text-[#EF4444]">{new Date(invoice.due_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                      )}
                      <tr>
                        <td className="py-1 font-bold text-right pr-4 uppercase tracking-wider">Status:</td>
                        <td className="py-1 font-bold text-right uppercase tracking-wider text-[#000000]">{invoice.status}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MAKLUMAT CLIENT */}
              <div className="mb-10 pt-2 avoid-break">
                <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-2 border-l-2 border-black pl-3">
                  {isReceiptMode ? "Received From" : "Billed To"}
                </h3>
                <p className="text-[16px] font-bold text-[#000000] leading-snug pl-3">{invoice.client_name}</p>
                <div className="mt-2 space-y-1 pl-3">
                  {invoice.client_pic && <p className="text-[12px] text-[#000000] font-bold">Attn: {invoice.client_pic}</p>}
                  {invoice.client_address && <div className="text-[11px] text-[#374151] leading-relaxed max-w-[70%]">{formatAddress(invoice.client_address)}</div>}
                  {invoice.client_email && <p className="text-[11px] text-[#374151] pt-1">{invoice.client_email}</p>}
                  {invoice.client_phone && <p className="text-[11px] text-[#374151]">{invoice.client_phone}</p>}
                </div>
              </div>

              {/* JADUAL ITEM */}
              <div className="min-h-[150px]">
                <table className="w-full mb-8 border-collapse">
                  <thead>
                    <tr className="border-y-2 border-[#000000] avoid-break">
                      <th className="py-3 px-2 text-left text-[10px] font-black uppercase tracking-widest text-[#000000] w-[55%]">Description</th>
                      <th className="py-3 px-2 text-center text-[10px] font-black uppercase tracking-widest text-[#000000] w-[5%]">Qty</th>
                      <th className="py-3 px-2 text-right text-[10px] font-black uppercase tracking-widest text-[#000000] w-[15%]">Unit Price</th>
                      <th className="py-3 px-2 text-center text-[10px] font-black uppercase tracking-widest text-[#000000] w-[10%]">Tax</th>
                      <th className="py-3 px-2 text-right text-[10px] font-black uppercase tracking-widest text-[#000000] w-[15%]">Total (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!invoice.items || invoice.items.length === 0) ? (
                      <tr className="border-b border-[#E5E7EB] avoid-break">
                        <td className="py-5 px-2 text-[12px] font-medium leading-relaxed whitespace-pre-wrap text-[#000000]">{invoice.description}</td>
                        <td className="py-5 px-2 text-[12px] text-center font-medium text-[#374151] align-top">1</td>
                        <td className="py-5 px-2 text-[12px] text-right font-medium text-[#374151] align-top">{Number(invoice.amount).toLocaleString('en-MY', {minimumFractionDigits:2})}</td>
                        <td className="py-5 px-2 text-[12px] text-center font-medium text-[#374151] align-top">-</td>
                        <td className="py-5 px-2 text-[12px] text-right font-bold text-[#000000] align-top">{Number(invoice.amount).toLocaleString('en-MY', {minimumFractionDigits:2})}</td>
                      </tr>
                    ) : (
                      invoice.items.map((item: any, idx: number) => (
                        item.type === 'title' ? (
                          <tr key={idx} className="bg-[#F9FAFB] avoid-break">
                            <td colSpan={5} className="py-4 px-2 text-[11px] font-black text-[#000000] uppercase tracking-wider border-b border-[#E5E7EB] whitespace-pre-wrap leading-relaxed">
                              {item.description}
                            </td>
                          </tr>
                        ) : (
                          <tr key={idx} className="border-b border-[#E5E7EB] avoid-break">
                            <td className="py-5 px-2 text-[12px] font-medium leading-relaxed whitespace-pre-wrap text-[#000000]">{item.description}</td>
                            <td className="py-5 px-2 text-[12px] text-center font-medium text-[#374151] align-top">{item.qty}</td>
                            <td className="py-5 px-2 text-[12px] text-right font-medium text-[#374151] align-top">{Number(item.price).toLocaleString('en-MY', {minimumFractionDigits:2})}</td>
                            <td className="py-5 px-2 text-[12px] text-center font-medium text-[#374151] align-top">{item.taxRate ? `${item.taxRate}%` : '-'}</td>
                            <td className="py-5 px-2 text-[12px] text-right font-bold text-[#000000] align-top">{Number(item.total).toLocaleString('en-MY', {minimumFractionDigits:2})}</td>
                          </tr>
                        )
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PENGIRAAN JUMLAH BESAR */}
              <div className="flex justify-end mb-12 avoid-break">
                <div className="w-[70%] md:w-[45%]">
                  <div className="flex justify-between py-2 border-b border-[#F3F4F6] text-[12px]">
                    <span className="text-[#374151] font-bold uppercase tracking-wider">Subtotal</span>
                    <span className="font-bold text-[#000000]">{Number(invoice.subtotal || invoice.amount).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                  </div>
                  {Number(invoice.discount) > 0 && (
                    <div className="flex justify-between py-2 border-b border-[#F3F4F6] text-[12px]">
                      <span className="text-[#374151] font-bold uppercase tracking-wider">Discount</span>
                      <span className="font-bold text-[#EF4444]">- {Number(invoice.discount).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                    </div>
                  )}
                  {Number(invoice.tax_amount) > 0 && (
                    <div className="flex justify-between py-2 border-b border-[#F3F4F6] text-[12px]">
                      <span className="text-[#374151] font-bold uppercase tracking-wider">Tax</span>
                      <span className="font-bold text-[#000000]">{Number(invoice.tax_amount).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                    </div>
                  )}
                  
                  {/* KALAU RESIT, TUNJUK AMOUNT PAID */}
                  <div className={`flex justify-between items-center border-y-2 border-[#000000] py-3 mt-1 ${isReceiptMode ? 'bg-green-50 px-2 border-green-600 border-b-2' : ''}`}>
                    <span className={`font-black text-[14px] uppercase tracking-widest ${isReceiptMode ? 'text-green-700' : 'text-[#000000]'}`}>
                      {isReceiptMode ? "Total Paid" : "Total Due"}
                    </span>
                    <span className={`text-[18px] font-black ${isReceiptMode ? 'text-green-700' : 'text-[#000000]'}`}>
                      RM {Number(invoice.amount).toLocaleString('en-MY', {minimumFractionDigits:2})}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD & T&C */}
              <div className="pt-8 border-t border-[#E5E7EB] grid grid-cols-1 md:grid-cols-2 gap-8 items-start avoid-break">
                <div>
                  <div className="border border-[#000000] p-5 w-full">
                    <h4 className="text-[11px] font-black mb-3 text-[#000000] uppercase tracking-widest">
                      {isReceiptMode ? "Payment Information" : "Payment Method"}
                    </h4>
                    {isReceiptMode ? (
                      <p className="text-[11px] font-bold text-gray-600 italic">Payment received with thanks. This serves as the official receipt for the transaction.</p>
                    ) : (
                      <table className="w-full text-[11px]">
                        <tbody>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Payee Name</td><td className="py-1 font-black text-[#000000]">: OMNYZO AGENCY</td></tr>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Bank Name</td><td className="py-1 font-black text-[#000000]">: MAYBANK BERHAD</td></tr>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Bank Account</td><td className="py-1 font-black text-[#000000]">: 5144-0481-2701</td></tr>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Swift Code</td><td className="py-1 font-black text-[#000000]">: MBBEMYKL</td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-[#374151]">
                  {invoice.notes && !isReceiptMode && (
                    <div className="mb-4">
                      <h4 className="font-black text-[#000000] uppercase tracking-widest mb-1">Notes</h4>
                      <p className="whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.terms && !isReceiptMode && (
                    <div>
                      <h4 className="font-black text-[#000000] uppercase tracking-widest mb-1">Terms & Conditions</h4>
                      <p className="whitespace-pre-wrap leading-relaxed">{invoice.terms}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}