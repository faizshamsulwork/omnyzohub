import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "../../components/PrintButton";

export const revalidate = 0;

// Automatik tukar tajuk tab & nama fail download ikut Quote No.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data } = await supabase.from("quotations").select("quote_no").eq("id", resolvedParams.id).single();
  return { title: data?.quote_no || "Quotation" };
}

export default async function QuotationDocument({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data: quote } = await supabase.from("quotations").select("*").eq("id", resolvedParams.id).single();
  if (!quote) notFound(); 

  const { data: client } = await supabase.from("contacts").select("*").eq("name", quote.client_name).single();
  const dateFormatted = new Date(quote.date).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
  const validUntilFormatted = new Date(quote.valid_until).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black py-10 px-4 md:px-0 transition-colors print:p-0 print:bg-white">
      
      {/* HEADER KAWALAN (Hanya nampak kat skrin, sembunyi dalam PDF) */}
      <div className="max-w-[21cm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/quotations" className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white flex items-center gap-2">
          &larr; Back to Quotations
        </Link>
        <PrintButton documentName={quote.quote_no} />
      </div>

      <div className="w-full overflow-x-auto pb-10 print:overflow-visible">
        <div className="min-w-[21cm] flex justify-center print:block">
          
          {/* KERTAS A4 (Layout diperkemas) */}
          <div className="w-[21cm] min-h-screen print:min-h-0 bg-white p-12 md:p-20 print:p-0 mx-auto shadow-2xl print:shadow-none text-black transition-all">
            
            {/* LOGO & JENIS DOKUMEN */}
            <div className="flex justify-between items-start mb-16 border-b-2 border-gray-100 pb-10">
              <div>
                <img src="/logo.png" alt="Omnyzo Logo" className="h-30 object-contain mb-1" />
                <p className="text-[15px] text-gray-400 font-bold uppercase tracking-[0.2em]">OMNYZO AGENCY</p>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-light text-gray-200 tracking-[0.3em] uppercase mb-2">Quotation</h2>
                <p className="text-sm font-black text-black">{quote.quote_no}</p>
              </div>
            </div>

            {/* INFO KLIEN & TARIKH */}
            <div className="grid grid-cols-2 gap-10 mb-16">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Prepared For:</p>
                <h3 className="text-xl font-bold text-black mb-2">{quote.client_name}</h3>
                {client && (
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {client.pic_name && <p className="font-bold text-gray-800">Attn: {client.pic_name}</p>}
                    <p className="max-w-[280px]">{client.address}, {client.postcode} {client.city}, {client.state}</p>
                    {client.phone && <p className="mt-2 text-blue-600 font-medium">{client.phone}</p>}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end text-right">
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date Issued:</p>
                  <p className="text-sm font-bold text-black">{dateFormatted}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valid Until:</p>
                  <p className="text-sm font-bold text-black">{validUntilFormatted}</p>
                </div>
              </div>
            </div>

            {/* JADUAL ITEMS */}
            <div className="mb-12">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-black">
                    <th className="py-4 px-2 text-[10px] font-bold text-black uppercase tracking-widest">Description</th>
                    <th className="py-4 px-2 text-[10px] font-bold text-black uppercase tracking-widest text-center w-16">Qty</th>
                    <th className="py-4 px-2 text-[10px] font-bold text-black uppercase tracking-widest text-right w-28">Unit Price</th>
                    <th className="py-4 px-2 text-[10px] font-bold text-black uppercase tracking-widest text-center w-16">Tax</th>
                    <th className="py-4 px-2 text-[10px] font-bold text-black uppercase tracking-widest text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item: any, idx: number) => (
                    item.type === 'title' ? (
                      <tr key={idx} className="bg-gray-50">
                        <td colSpan={5} className="py-4 px-4 text-xs font-black text-black uppercase tracking-wider border-b border-gray-200">
                          {item.description}
                        </td>
                      </tr>
                    ) : (
                      <tr key={idx} className="border-b border-gray-100 align-top">
                        <td className="py-6 px-4 text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {item.description}
                        </td>
                        <td className="py-6 px-2 text-sm text-gray-600 text-center">{item.qty}</td>
                        <td className="py-6 px-2 text-sm text-gray-600 text-right">{Number(item.price).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                        <td className="py-6 px-2 text-sm text-gray-400 text-center">{item.taxRate ? `${item.taxRate}%` : '-'}</td>
                        <td className="py-6 px-2 text-sm font-bold text-black text-right">RM {Number(item.total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>

            {/* RINGKASAN HARGA (Guna break-inside-avoid) */}
            <div className="flex justify-end mb-20 break-inside-avoid">
              <div className="w-full max-w-[320px]">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-400 font-medium">Subtotal</span>
                  <span className="font-bold text-black">RM {Number(quote.subtotal).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(quote.discount) > 0 && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-400 font-medium">Discount</span>
                    <span className="font-bold text-red-600">-RM {Number(quote.discount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {Number(quote.tax_amount) > 0 && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-400 font-medium">Tax / SST</span>
                    <span className="font-bold text-black">RM {Number(quote.tax_amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between py-5 border-t-2 border-black mt-2">
                  <span className="text-lg font-black uppercase tracking-tighter">Total Due</span>
                  <span className="text-2xl font-black text-black tracking-tight">RM {Number(quote.total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* TERMA & SYARAT (Guna break-inside-avoid supaya tak terpotong) */}
            <div className="pt-10 border-t border-gray-100 break-inside-avoid">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {quote.notes && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Special Notes:</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Terms & Conditions:</p>
                  <p className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed italic">{quote.terms}</p>
                </div>
              </div>
              <p className="text-[9px] text-gray-300 mt-16 text-center italic tracking-widest uppercase">This is a computer-generated document. No signature required.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}