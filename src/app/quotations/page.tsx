import Link from "next/link";
import { supabase } from "../lib/supabase";
import QuotationAction from "../components/QuotationAction";

export const revalidate = 0; 

export default async function QuotationsPage() {
  const { data: quotes } = await supabase
    .from('quotations')
    .select('*')
    .order('created_at', { ascending: false });

  const totalQuotes = quotes?.length || 0;
  const draftQuotes = quotes?.filter(q => q.status === 'Draft') || [];
  const approvedQuotes = quotes?.filter(q => q.status === 'Approved') || [];
  
  // Pipeline = Duit dari quote yang masih Draft
  const pipelineTotal = draftQuotes.reduce((sum, q) => sum + Number(q.total), 0);

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 selection:text-black relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight transition-colors">Quotations</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg transition-colors">Send quotes, track approvals and pipeline.</p>
          </div>
          {/* Letak ni bersebelahan tajuk "Quotations" kau */}
<div className="flex justify-between items-center mb-6">
  <div>
    <h1 className="text-2xl font-bold">Quotations</h1>
    <p className="text-sm text-gray-500">Send quotes, track approvals and pipeline.</p>
  </div>
  {/* Butang Desktop (Akan hilang di Mobile) */}
  <Link href="/new-quotation" className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg items-center gap-2 transition-transform active:scale-95">
    + Create Quotation
  </Link>
</div>
          
         
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total Quotes</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{totalQuotes}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-blue-200 dark:border-blue-900/30 transition-colors">
            <h3 className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2">Pipeline (Draft)</h3>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">RM {pipelineTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-[11px] font-bold text-green-500 uppercase tracking-wider mb-2">Approved</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{approvedQuotes.length}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-6 rounded-[24px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-2">Draft / Sent</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{draftQuotes.length}</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl p-8 rounded-[32px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 min-h-[400px] transition-colors">
          {quotes && quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Quote No.</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-center">Status</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-blue-600 dark:text-blue-400">{q.quote_no}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">{q.client_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{new Date(q.date).toLocaleDateString('en-MY')}</td>
                      <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">RM {Number(q.total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-sm text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${q.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <QuotationAction quote={q} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center py-20 text-gray-500">No quotations found.</div>
          )}
        </div>

      </div>
    </div>
  );
}