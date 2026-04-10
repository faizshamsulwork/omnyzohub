import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "../../components/PrintButton";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data } = await supabase.from("invoices").select("invoice_no, id").eq("id", resolvedParams.id).single();
  const title = data?.invoice_no || `INV-${data?.id.split('-')[0].toUpperCase()}` || "Invoice";
  return { title: title };
}

export default async function InvoiceDocument({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", resolvedParams.id).single();
  if (!invoice) notFound(); 

  const { data: client } = await supabase.from("contacts").select("*").eq("name", invoice.client_name).single();

  const invoiceNumber = invoice.invoice_no || `INV-${invoice.id.split('-')[0].toUpperCase()}`;
  const dateFormatted = new Date(invoice.created_at).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const dueDate = new Date(invoice.created_at);
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateFormatted = dueDate.toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black py-10 px-4 md:px-0 transition-colors print:p-0 print:bg-white">
      
      <div className="max-w-[21cm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/invoices" className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white flex items-center gap-2">
          &larr; Back to Invoices
        </Link>
        <PrintButton documentName={invoiceNumber} />
      </div>

      <div className="w-full overflow-x-auto pb-10 print:overflow-visible">
        <div className="min-w-[21cm] flex justify-center print:block">
          
          <div className="w-[21cm] min-h-screen print:min-h-0 bg-white p-12 md:p-16 print:p-0 mx-auto shadow-2xl print:shadow-none text-black transition-all relative">
            
            <div className="relative z-10">
              {/* LOGO & JENIS DOKUMEN */}
              <div className="flex justify-between items-start mb-14 border-b-2 border-gray-100 pb-8">
                <div>
                 <img src="/logo.png" alt="Omnyzo Logo" className="h-30 object-contain mb-1" />
                  <p className="text-[15px] text-gray-400 font-bold uppercase tracking-[0.2em]">OMNYZO AGENCY</p>
                </div>
                <div className="text-right">
                  <h2 className="text-4xl font-light text-gray-200 tracking-[0.3em] uppercase mb-2">Invoice</h2>
                  <p className="text-sm font-black text-black">#{invoiceNumber}</p>
                </div>
              </div>

              {/* INFO KLIEN & TARIKH */}
              <div className="grid grid-cols-2 gap-10 mb-14">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Billed To:</p>
                  <h3 className="text-lg font-bold text-black mb-1">{invoice.client_name}</h3>
                  {client && (
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {client.pic_name && <p className="font-bold text-gray-800">Attn: {client.pic_name}</p>}
                      <p className="max-w-[280px]">{client.address}, {client.postcode} {client.city}, {client.state}</p>
                      {client.phone && <p className="mt-2 text-blue-600 font-medium">{client.phone}</p>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end text-right">
                  <div className="mb-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date Issued:</p>
                    <p className="text-sm font-bold text-black">{dateFormatted}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-red-500">Due Date:</p>
                    <p className="text-sm font-bold text-red-600">{dueDateFormatted}</p>
                  </div>
                </div>
              </div>

              {/* JADUAL ITEMS */}
              <div className="mb-10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y border-black">
                      <th className="py-3 px-2 text-[10px] font-bold text-black uppercase tracking-widest">Description</th>
                      <th className="py-3 px-2 text-[10px] font-bold text-black uppercase tracking-widest text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 align-top">
                      <td className="py-8 px-4 text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {invoice.description || "Creative Services & Campaign Management"}
                      </td>
                      <td className="py-8 px-2 text-sm font-bold text-black text-right">RM {Number(invoice.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RINGKASAN HARGA - FIX 3: Kurangkan jarak margin bawah dari mb-20 ke mb-10 */}
              <div className="flex justify-end mb-10 break-inside-avoid">
                <div className="w-full max-w-[320px]">
                  <div className="flex justify-between py-4 border-t-2 border-black mt-2">
                    <span className="text-lg font-black uppercase tracking-tighter">Total Due</span>
                    <span className="text-2xl font-black text-black tracking-tight">RM {Number(invoice.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD & TERMS - FIX 3: Kurangkan padding atas dari pt-10 ke pt-6 */}
              <div className="pt-6 border-t border-gray-100 break-inside-avoid grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div>
                  <p className="text-[11px] font-black text-black uppercase tracking-widest mb-3">Payment Method:</p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr]">
                      <span className="text-gray-500">Payee Name</span>
                      <span className="font-bold text-black">: OMNYZO AGENCY</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr]">
                      <span className="text-gray-500">Bank Name</span>
                      <span className="font-bold text-black">: MAYBANK BERHAD</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr]">
                      <span className="text-gray-500">Bank Account</span>
                      <span className="font-bold text-black">: 5144-0481-2701</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr]">
                      <span className="text-gray-500">Swift Code</span>
                      <span className="font-bold text-black">: MBBEMYKL</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black text-black uppercase tracking-widest mb-3 underline underline-offset-4">Terms & Conditions</p>
                  <ul className="text-[10px] text-gray-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>Unless specified in the Quotation, Agency Fee is payable within 30 days from invoice date.</li>
                    <li>The Agency reserves the right to suspend any Services in the event of delay in payment.</li>
                    <li>Please indicate the invoice number as reference when transferring the funds.</li>
                    <li>Payment advice should be sent to <span className="font-bold text-black">billings@omnyzo.com</span>.</li>
                  </ul>
                </div>
                
              </div>
              
              {/* Teks Penutup - FIX 3: Kurangkan margin atas supaya muat */}
              <p className="text-[9px] text-gray-300 mt-10 text-center italic tracking-widest uppercase break-inside-avoid">This is a computer-generated document. No signature required.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}