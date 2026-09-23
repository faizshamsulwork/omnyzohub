"use client";

/* eslint-disable @next/next/no-img-element -- Raw images keep the print layout stable. */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import PrintButton from "../../components/PrintButton";
import { COMPANY_PROFILE } from "../../lib/company";
import { PDF_COLORS, type PdfDocumentModel } from "../../lib/pdf";
import type { Contact, Invoice } from "../../lib/types";
import { buildContactAddress, formatCurrency, isPaidStatus, toMoney } from "../../lib/utils";

export default function ReceiptDocument({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!invoiceId) return;

      const { data, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
      if (error) console.error("Error fetching invoice:", error);
      setInvoice(data);

      if (data?.client_name) {
        const { data: clientData } = await supabase
          .from("contacts")
          .select("*")
          .eq("name", data.client_name)
          .limit(1)
          .maybeSingle();
        if (clientData) setClient(clientData as Contact);
      }

      setIsLoading(false);
    };

    fetchReceipt();
  }, [invoiceId]);

  // generateMetadata() can't run in a client component, so the tab title is
  // set here instead once the invoice number is known — otherwise every
  // receipt tab is stuck on the generic app title, indistinguishable from
  // any other open tab.
  useEffect(() => {
    if (invoice) {
      const invoiceNumber = invoice.invoice_no || `INV-${invoice.id.split('-')[0].toUpperCase()}`;
      document.title = `OR-${invoiceNumber}`;
    }
  }, [invoice]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading Official Receipt...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl">Receipt not found.</div>;
  if (!isPaidStatus(invoice.status)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-xl font-bold text-red-500">No receipt available.</p>
        <p className="text-sm text-gray-500">A receipt is only issued once the invoice is fully paid.</p>
        <Link href={`/invoice/${invoice.id}`} className="mt-2 text-sm font-bold text-blue-600 hover:underline">View the invoice instead</Link>
      </div>
    );
  }

  const invoiceNumber = invoice.invoice_no || `INV-${invoice.id.split('-')[0].toUpperCase()}`;
  const receiptDateFormatted = new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
  const clientAddress = client ? buildContactAddress(client) : invoice.client_address || "";

  const buildPdfDocument = (): PdfDocumentModel => ({
    filename: `OR-${invoiceNumber}.pdf`,
    title: "Official Receipt",
    titleColor: PDF_COLORS.success,
    accent: PDF_COLORS.success,
    watermark: "PAID",
    subject: `Official Receipt for invoice ${invoiceNumber}`,
    keywords: [invoiceNumber, invoice.client_name, "receipt", COMPANY_PROFILE.currencyCode],
    meta: [
      { label: "Ref:", value: invoiceNumber },
      { label: "Receipt Date:", value: receiptDateFormatted },
      { label: "Payment Status:", value: "FULLY PAID", color: PDF_COLORS.success },
    ],
    party: {
      heading: "Received From",
      name: invoice.client_name,
      lines: [
        ...(client?.pic_name ? [{ text: `Attn: ${client.pic_name}`, strong: true, color: PDF_COLORS.black, size: 8.4 }] : []),
        ...(clientAddress ? [{ text: clientAddress }] : []),
      ],
    },
    columns: [
      { header: "Payment For", width: 76, align: "left" },
      { header: `Amount Received (${COMPANY_PROFILE.currencyCode})`, width: 24, align: "right" },
    ],
    rows: [{
      type: "item",
      description: `Settlement for Invoice #${invoiceNumber}`,
      subtitle: invoice.description || undefined,
      values: [toMoney(invoice.amount)],
    }],
    grandTotal: {
      label: "Total Paid",
      value: formatCurrency(invoice.amount),
      color: PDF_COLORS.success,
      tint: PDF_COLORS.successTint,
    },
    closingNote: {
      title: "Thank you for your business!",
      subtitle: "This is a computer-generated receipt. No signature is required.",
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black py-10 px-4 md:px-0 transition-colors print:p-0 print:bg-white">

      <div className="max-w-[21cm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/invoices" className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 flex items-center gap-2 transition-all active:scale-95">&larr; Back to Invoices</Link>
        <PrintButton documentName={`OR-${invoiceNumber}`} buildDocument={buildPdfDocument} />
      </div>

      <div className="w-full overflow-x-auto pb-10 print:overflow-visible">
        <div className="min-w-[21cm] flex justify-center print:block">
          <div className="w-[21cm] min-h-screen print:min-h-0 bg-white p-12 md:p-16 print:p-0 mx-auto shadow-2xl print:shadow-none text-black transition-all relative">

            <div className="relative z-10">
              {/* LOGO & JENIS DOKUMEN */}
              <div className="flex justify-between items-start mb-14 border-b-2 border-gray-100 pb-8">
                <div>
                  <img src="/logo.png" alt="Omnyzo Logo" className="h-10 object-contain mb-1" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Creative Digital Agency</p>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-light text-green-600 tracking-[0.2em] uppercase mb-2">Official Receipt</h2>
                  <p className="text-sm font-black text-black">REF: {invoiceNumber}</p>
                </div>
              </div>

              {/* INFO KLIEN & TARIKH */}
              <div className="grid grid-cols-2 gap-10 mb-14">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Received From:</p>
                  <h3 className="text-lg font-bold text-black mb-1">{invoice.client_name}</h3>
                  {client && (
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {client.pic_name && <p className="font-bold text-gray-800">Attn: {client.pic_name}</p>}
                      <p className="max-w-[280px]">{clientAddress}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end text-right">
                  <div className="mb-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receipt Date:</p>
                    <p className="text-sm font-bold text-black">{receiptDateFormatted}</p>
                  </div>
                  <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Payment Status</p>
                    <p className="text-lg font-black text-green-700 uppercase">FULLY PAID</p>
                  </div>
                </div>
              </div>

              {/* JADUAL ITEMS */}
              <div className="mb-10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y border-black">
                      <th className="py-3 px-2 text-[10px] font-bold text-black uppercase tracking-widest">Payment For</th>
                      <th className="py-3 px-2 text-[10px] font-bold text-black uppercase tracking-widest text-right w-32">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 align-top">
                      <td className="py-8 px-4 text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                        Settlement for Invoice #{invoiceNumber}
                        <br/><span className="text-gray-500 text-xs">{invoice.description}</span>
                      </td>
                      <td className="py-8 px-2 text-sm font-bold text-black text-right">{formatCurrency(invoice.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RINGKASAN HARGA */}
              <div className="flex justify-end mb-10 break-inside-avoid">
                <div className="w-full max-w-[320px]">
                  <div className="flex justify-between py-4 border-t-2 border-black mt-2 bg-green-50/50 px-4 rounded-xl">
                    <span className="text-lg font-black uppercase tracking-tighter text-green-800">Total Paid</span>
                    <span className="text-2xl font-black text-green-700 tracking-tight">{formatCurrency(invoice.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 break-inside-avoid text-center mt-20">
                <p className="text-sm font-bold text-gray-800 mb-2">Thank you for your business!</p>
                <p className="text-[9px] text-gray-400 italic tracking-widest uppercase">This is a computer-generated receipt. No signature is required.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
