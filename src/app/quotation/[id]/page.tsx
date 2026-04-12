"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import PrintButton from "../../components/PrintButton";

export default function QuotationViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;

  const [quote, setQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId) return;
      setTimeout(async () => {
        const { data, error } = await supabase
          .from("quotations")
          .select("*")
          .eq("id", quoteId)
          .single();
        if (error) console.error("Error fetching quote:", error);
        setQuote(data);
        setIsLoading(false);
      }, 500);
    };
    fetchQuote();
  }, [quoteId]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading Official Document...</div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl">Quotation not found.</div>;

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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0A0A0A] py-8 px-2 md:px-8 pb-32">
      
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/quotations" className="text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-sm transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </Link>
        <PrintButton documentName={`Quotation ${quote.quote_no}`} targetId="quotation-document" filename={`${quote.quote_no}_Omnyzo.pdf`} />
      </div>

      <div className="overflow-x-auto w-full pb-8 scrollbar-hide flex justify-center">
        <div className="shadow-2xl bg-white">
          <div id="quotation-document" className="w-[210mm] bg-[#ffffff] relative box-border font-sans flex flex-col h-auto pb-10">
            
            <div className="p-10 md:p-[50px] text-[#000000] flex-grow flex flex-col">
              
              {/* HEADER (Dah dicuci) */}
              <div className="flex justify-between items-start mb-12 border-b-2 border-[#F3F4F6] pb-8 avoid-break">
                <div className="w-1/2">
                  <img src="/logo.png" alt="Omnyzo" className="h-16 mb-2 object-contain" />
                  <h1 className="text-[14px] font-black tracking-widest text-[#000000] uppercase mb-1">Omnyzo Agency</h1>
                </div>
                <div className="w-1/2 text-right">
                  <h2 className="text-[32px] font-black tracking-tighter text-[#000000] mb-4 uppercase">Quotation</h2>
                  
                  <table className="w-full text-[11px] text-[#374151] ml-auto">
                    <tbody>
                      <tr><td className="py-1 font-bold text-right pr-4 uppercase tracking-wider w-[60%]">Quote No:</td><td className="py-1 font-bold text-[#000000] text-right">{quote.quote_no}</td></tr>
                      <tr><td className="py-1 font-bold text-right pr-4 uppercase tracking-wider">Date:</td><td className="py-1 text-right">{new Date(quote.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                      <tr><td className="py-1 font-bold text-right pr-4 uppercase tracking-wider text-[#EF4444]">Valid Until:</td><td className="py-1 text-right font-bold text-[#EF4444]">{new Date(quote.valid_until).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                      <tr><td className="py-1 font-bold text-right pr-4 uppercase tracking-wider">Status:</td><td className="py-1 font-bold text-right uppercase tracking-wider text-[#000000]">{quote.status}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MAKLUMAT CLIENT */}
              <div className="mb-10 pt-2 avoid-break">
                <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-2 border-l-2 border-black pl-3">Prepared For</h3>
                <p className="text-[16px] font-bold text-[#000000] leading-snug pl-3">{quote.client_name}</p>
                <div className="mt-2 space-y-1 pl-3">
                  {quote.client_pic && <p className="text-[12px] text-[#000000] font-bold">Attn: {quote.client_pic}</p>}
                  {quote.client_address && <div className="text-[11px] text-[#374151] leading-relaxed max-w-[70%]">{formatAddress(quote.client_address)}</div>}
                  {quote.client_email && <p className="text-[11px] text-[#374151] pt-1">{quote.client_email}</p>}
                  {quote.client_phone && <p className="text-[11px] text-[#374151]">{quote.client_phone}</p>}
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
                    {quote.items && quote.items.map((item: any, idx: number) => (
                      item.type === 'title' ? (
                        <tr key={idx} className="bg-[#F9FAFB] avoid-break">
                          <td colSpan={5} className="py-4 px-2 text-[11px] font-black text-[#000000] uppercase tracking-wider border-b border-[#E5E7EB] whitespace-pre-wrap leading-relaxed">{item.description}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PENGIRAAN JUMLAH BESAR */}
              <div className="flex justify-end mb-12 avoid-break">
                <div className="w-[70%] md:w-[45%]">
                  <div className="flex justify-between py-2 border-b border-[#F3F4F6] text-[12px]">
                    <span className="text-[#374151] font-bold uppercase tracking-wider">Subtotal</span>
                    <span className="font-bold text-[#000000]">{Number(quote.subtotal).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                  </div>
                  {Number(quote.discount) > 0 && (
                    <div className="flex justify-between py-2 border-b border-[#F3F4F6] text-[12px]">
                      <span className="text-[#374151] font-bold uppercase tracking-wider">Discount</span>
                      <span className="font-bold text-[#EF4444]">- {Number(quote.discount).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                    </div>
                  )}
                  {Number(quote.tax_amount) > 0 && (
                    <div className="flex justify-between py-2 border-b border-[#F3F4F6] text-[12px]">
                      <span className="text-[#374151] font-bold uppercase tracking-wider">Tax</span>
                      <span className="font-bold text-[#000000]">{Number(quote.tax_amount).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-y-2 border-[#000000] py-3 mt-1">
                    <span className="font-black text-[14px] uppercase tracking-widest text-[#000000]">Grand Total</span>
                    <span className="text-[18px] font-black text-[#000000]">RM {Number(quote.total).toLocaleString('en-MY', {minimumFractionDigits:2})}</span>
                  </div>
                </div>
              </div>

              {/* SIGNATURE BLOCK */}
              <div className="pt-8 border-t border-[#E5E7EB] grid grid-cols-1 md:grid-cols-2 gap-10 items-start avoid-break">
                <div className="text-[10px] text-[#374151]">
                  {quote.notes && (
                    <div className="mb-4">
                      <h4 className="font-black text-[#000000] uppercase tracking-widest mb-1">Special Notes</h4>
                      <p className="whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
                    </div>
                  )}
                  {quote.terms && (
                    <div>
                      <h4 className="font-black text-[#000000] uppercase tracking-widest mb-1">Terms & Conditions</h4>
                      <p className="whitespace-pre-wrap leading-relaxed">{quote.terms}</p>
                    </div>
                  )}
                </div>
                <div>
                  <div className="border border-[#000000] p-6 w-full bg-[#FAFAFA]">
                    <h4 className="text-[12px] font-black mb-1 text-[#000000] uppercase tracking-widest">Client Acceptance</h4>
                    <p className="text-[10px] text-[#6B7280] mb-8 leading-relaxed">
                      I/We agree to the terms, conditions, and pricing stated in this quotation and authorize commencement of the project.
                    </p>
                    <div className="space-y-6 text-[11px] font-bold text-[#374151]">
                      <div className="flex items-end"><span className="w-24 uppercase tracking-wider">Signature</span><div className="flex-1 border-b border-[#000000]"></div></div>
                      <div className="flex items-end"><span className="w-24 uppercase tracking-wider">Name</span><div className="flex-1 border-b border-[#000000]"></div></div>
                      <div className="flex items-end"><span className="w-24 uppercase tracking-wider">Date</span><div className="flex-1 border-b border-[#000000]"></div></div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}