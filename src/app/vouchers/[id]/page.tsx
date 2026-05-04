"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "../../lib/supabase"; 
import Link from "next/link";
import PrintButton from "../../components/PrintButton"; 

export default function VoucherViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const voucherId = resolvedParams.id;

  const [expense, setExpense] = useState<any>(null);
  const [freelancer, setFreelancer] = useState<any>(null);
  const [parsedData, setParsedData] = useState({ voucherNo: "PV-UNKNOWN", name: "Unknown", itemDesc: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      if (!voucherId) return;
      
      // 1. Tarik data dari laci expenses
      const { data: expData, error: expError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", voucherId)
        .single();
      
      if (expError) console.error("Error fetching expense:", expError);
      
      if (expData) {
        setExpense(expData);
        
        // 2. Ekstrak data dari description
        let vNo = expData.id.substring(0,8).toUpperCase(); // Default fallback
        let fName = "Vendor / Freelancer";
        let desc = expData.description;

        const match = expData.description.match(/^\[(.*?)\] Payment to (.*?) - (.*)$/);
        if (match) {
          vNo = match[1];
          fName = match[2];
          desc = match[3];
        }

        setParsedData({ voucherNo: vNo, name: fName, itemDesc: desc });

        // 3. Tarik bank details freelancer
        const { data: contactData } = await supabase
          .from("contacts")
          .select("*")
          .eq("name", fName)
          .single();
          
        if (contactData) setFreelancer(contactData);
      }
      
      setIsLoading(false);
    };
    
    fetchVoucher();
  }, [voucherId]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading Payment Voucher...</div>;
  if (!expense) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl">Voucher not found.</div>;

  const documentTitle = `Payment Voucher ${parsedData.voucherNo}`;
  const pdfFilename = `${parsedData.voucherNo}_Payment_Voucher.pdf`;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0A0A0A] py-8 px-2 md:px-8 pb-32 transition-colors duration-300">
      
      {/* ACTION BAR (NON-PRINTABLE) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/expenses" className="text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-sm transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Expenses
        </Link>
        
        <div className="flex items-center gap-3">
          <PrintButton documentName={documentTitle} targetId="voucher-document" filename={pdfFilename} />
        </div>
      </div>

      <div className="overflow-x-auto w-full pb-8 scrollbar-hide flex justify-center">
        <div className="shadow-2xl bg-white transition-all duration-500">
          <div id="voucher-document" className="w-[210mm] bg-[#ffffff] relative box-border font-sans flex flex-col h-auto pb-10 overflow-hidden">

            <div className="p-10 md:p-[50px] text-[#000000] flex-grow flex flex-col relative z-10">
              
              {/* HEADER */}
              <div className="flex justify-between items-start mb-12 border-b-2 border-[#F3F4F6] pb-8 avoid-break">
                <div className="w-1/2">
                  <img src="/logo.png" alt="Omnyzo" className="h-16 mb-2 object-contain" />
                  <h1 className="text-[14px] font-black tracking-widest text-[#000000] uppercase mb-1">Omnyzo Agency</h1>
                </div>
                <div className="w-1/2 text-right">
                  <h2 className="text-[28px] font-black tracking-tighter text-[#000000] mb-4 uppercase text-purple-800">
                    Payment Voucher
                  </h2>
                  
                  <table className="w-full text-[11px] text-[#374151] ml-auto">
                    <tbody>
                      <tr>
                        <td className="py-1 font-bold text-right pr-4 uppercase tracking-wider w-[60%]">Voucher No:</td>
                        <td className="py-1 font-bold text-[#000000] text-right">{parsedData.voucherNo}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-right pr-4 uppercase tracking-wider">Date:</td>
                        <td className="py-1 text-right">{new Date(expense.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-right pr-4 uppercase tracking-wider">Category:</td>
                        <td className="py-1 font-bold text-right text-[#000000]">{expense.category.replace(' *', '')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MAKLUMAT FREELANCER / VENDOR */}
              <div className="mb-10 pt-2 avoid-break">
                <h3 className="text-[10px] font-black text-purple-800 uppercase tracking-widest mb-2 border-l-2 border-purple-800 pl-3">
                  Paid To
                </h3>
                <p className="text-[16px] font-bold text-[#000000] leading-snug pl-3">{parsedData.name}</p>
                {freelancer && (
                  <div className="mt-2 space-y-1 pl-3">
                    {freelancer.service_role && <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{freelancer.service_role}</p>}
                    {freelancer.email && <p className="text-[11px] text-[#374151] pt-1">{freelancer.email}</p>}
                    {freelancer.phone && <p className="text-[11px] text-[#374151]">{freelancer.phone}</p>}
                  </div>
                )}
              </div>

              {/* JADUAL ITEM */}
              <div className="min-h-[150px]">
                <table className="w-full mb-8 border-collapse">
                  <thead>
                    <tr className="border-y-2 border-[#000000] avoid-break">
                      <th className="py-3 px-2 text-left text-[10px] font-black uppercase tracking-widest text-[#000000] w-[70%]">Description of Services / Goods</th>
                      <th className="py-3 px-2 text-center text-[10px] font-black uppercase tracking-widest text-[#000000] w-[10%]">Qty</th>
                      <th className="py-3 px-2 text-right text-[10px] font-black uppercase tracking-widest text-[#000000] w-[20%]">Amount (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E5E7EB] avoid-break">
                      <td className="py-5 px-2 text-[12px] font-medium leading-relaxed whitespace-pre-wrap text-[#000000]">{parsedData.itemDesc}</td>
                      <td className="py-5 px-2 text-[12px] text-center font-medium text-[#374151] align-top">1</td>
                      <td className="py-5 px-2 text-[12px] text-right font-bold text-[#000000] align-top">{Number(expense.amount).toLocaleString('en-MY', {minimumFractionDigits:2})}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* PENGIRAAN JUMLAH BESAR */}
              <div className="flex justify-end mb-12 avoid-break">
                <div className="w-[70%] md:w-[45%]">
                  <div className="flex justify-between items-center border-y-2 border-[#000000] py-3 mt-1 bg-purple-50 px-2 border-purple-800 border-b-2">
                    <span className="font-black text-[14px] uppercase tracking-widest text-purple-900">
                      Total Paid
                    </span>
                    <span className="text-[18px] font-black text-purple-900">
                      RM {Number(expense.amount).toLocaleString('en-MY', {minimumFractionDigits:2})}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD & SIGNATURES */}
              <div className="pt-8 border-t border-[#E5E7EB] grid grid-cols-1 md:grid-cols-2 gap-8 items-start avoid-break">
                <div>
                  <div className="border border-[#000000] p-5 w-full">
                    <h4 className="text-[11px] font-black mb-3 text-[#000000] uppercase tracking-widest">
                      Transfer Details (Beneficiary)
                    </h4>
                    {freelancer && freelancer.bank_account ? (
                      <table className="w-full text-[11px]">
                        <tbody>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Account Name</td><td className="py-1 font-black text-[#000000]">: {freelancer.name}</td></tr>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Bank Name</td><td className="py-1 font-black text-[#000000]">: {freelancer.bank_name}</td></tr>
                          <tr><td className="py-1 font-bold text-[#374151] w-28">Account No</td><td className="py-1 font-black text-purple-700 font-mono tracking-wider">: {freelancer.bank_account}</td></tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">No bank details recorded in contact directory.</p>
                    )}
                  </div>
                </div>
                
                {/* 🔴 SIGNATURE BLOCK DENGAN AUTOMASI GAMBAR */}
                <div className="flex justify-end pt-4 mt-6">
                  <div className="w-56 text-center relative">
                    
                    {/* Gambar diturunkan secara paksa guna 'translate-y-8' supaya dakwat bertindih garisan */}
                    <img 
                      src="/signature.png" 
                      alt="Authorized Signature" 
                      className="absolute z-10 bottom-0 left-1/2 transform -translate-x-1/2 translate-y-12 h-[200px] w-auto object-contain mix-blend-multiply pointer-events-none" 
                    />
                    
                    {/* Ruang Kosong & Garisan */}
                    <div className="border-b border-black mb-2 h-16 relative z-0"></div>
                    
                    <p className="text-[10px] font-bold text-[#000000] uppercase tracking-widest relative z-10">Authorized By</p>
                    <p className="text-[9px] text-[#374151] relative z-10">Faiz Shamsul - Omnyzo Agency</p>
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