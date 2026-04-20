"use client";

import Link from "next/link";
import { supabase } from "../lib/supabase";
import ContactAction from "../components/ContactAction";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// 🔴 HELPER: Jana Mesh Gradient unik berdasarkan nama (Untuk semua)
const generateMeshGradient = (name: string) => {
  const cleanName = name ? name.trim() : "";
  if (!cleanName) return "linear-gradient(135deg, #a18cd1, #fbc2eb)";
  const sum = cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const h1 = (sum * 13) % 360;
  const h2 = (sum * 29) % 360;
  const h3 = (sum * 43) % 360;
  return `
    radial-gradient(circle at 10% 10%, hsl(${h1}, 80%, 65%), transparent 60%),
    radial-gradient(circle at 90% 90%, hsl(${h2}, 80%, 65%), transparent 60%),
    radial-gradient(circle at 50% 50%, hsl(${h3}, 80%, 65%), transparent 60%),
    hsl(${(h1 + h2) / 2}, 60%, 40%)
  `;
};

export default function ContactsDirectory() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedBank, setSelectedBank] = useState<any>(null);

  const fetchContacts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching contacts:", error);
    else setContacts(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const customers = contacts.filter(c => c.contact_type === 'Customer');
  const freelancers = contacts.filter(c => c.contact_type === 'Freelancer');

  const handleCopyBank = (accountNo: string) => {
    if (!accountNo) return toast.error("No bank account recorded.");
    navigator.clipboard.writeText(accountNo);
    toast.success("Account number copied!");
  };

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 selection:text-black relative transition-colors duration-500 pb-32">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight transition-colors">Contacts Directory</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg transition-colors">Manage your Freelancers and Customers separately.</p>
          </div>
          <div>
            <Link href="/new-contact" className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 active:scale-95 inline-block">
              + New Contact
            </Link>
          </div>
        </header>

        {/* ===================== JADUAL CUSTOMERS ===================== */}
        <div className="mb-4 px-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide transition-colors">Customers</h2>
        </div>
        <div className="mb-12 bg-white/60 dark:bg-[#111111]/60 backdrop-blur-2xl p-8 rounded-[32px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors duration-500 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {isLoading ? (
             <div className="text-center py-10 text-gray-400 animate-pulse">Loading contacts...</div>
          ) : customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company Name</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PIC Name</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((contact) => (
                    <tr key={contact.id} className="group border-b border-gray-100 dark:border-gray-900/50 hover:bg-white dark:hover:bg-[#1A1A1C] hover:shadow-lg hover:shadow-gray-200/30 dark:hover:shadow-black/40 transition-all duration-300 cursor-default rounded-2xl">
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white rounded-l-2xl">
                        <div className="flex items-center gap-4">
                          
                          {/* 🔴 AVATAR CUSTOMER DITAMBAH EFEK GLOW BERCAHAYA */}
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] group-hover:border-white/60 transition-all duration-300 border border-white/20"
                            style={{ background: generateMeshGradient(contact.name) }}
                          >
                            <span className="drop-shadow-md">{contact.name ? contact.name.trim().charAt(0).toUpperCase() : "?"}</span>
                          </div>
                          
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{contact.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{contact.pic_name || "-"}</td>
                      <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{contact.phone}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{contact.email || "-"}</td>
                      
                      <td className="py-4 px-4 text-right rounded-r-2xl">
                        <div className="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                          <ContactAction id={contact.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">No customers found.</div>
          )}
        </div>

        {/* ===================== JADUAL FREELANCERS ===================== */}
        <div className="mb-4 px-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide transition-colors">Freelancers</h2>
        </div>
        <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-2xl p-8 rounded-[32px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors duration-500 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          {isLoading ? (
             <div className="text-center py-10 text-gray-400 animate-pulse">Loading contacts...</div>
          ) : freelancers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service / Role</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Bank Details</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {freelancers.map((contact) => (
                    <tr key={contact.id} className="group border-b border-gray-100 dark:border-gray-900/50 hover:bg-white dark:hover:bg-[#1A1A1C] hover:shadow-lg hover:shadow-gray-200/30 dark:hover:shadow-black/40 transition-all duration-300 cursor-default rounded-2xl">
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white rounded-l-2xl">
                        <div className="flex items-center gap-4">
                          
                          {/* 🔴 AVATAR FREELANCER DITAMBAH EFEK GLOW BERCAHAYA */}
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] group-hover:border-white/60 transition-all duration-300 border border-white/20"
                            style={{ background: generateMeshGradient(contact.name) }}
                          >
                            <span className="drop-shadow-md">{contact.name ? contact.name.trim().charAt(0).toUpperCase() : "?"}</span>
                          </div>
                          
                          <span className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{contact.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className="px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10 group-hover:bg-purple-50 group-hover:text-purple-700 group-hover:border-purple-200 dark:group-hover:bg-purple-900/30 dark:group-hover:text-purple-300 transition-colors duration-300">
                          {(contact.service_role || "FREELANCER")}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{contact.phone}</td>
                      
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => setSelectedBank(contact)}
                          className="opacity-70 group-hover:opacity-100 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-gray-600 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-300 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 mx-auto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          Bank Info
                        </button>
                      </td>

                      <td className="py-4 px-4 text-right rounded-r-2xl">
                        <div className="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                          <ContactAction id={contact.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">No freelancers found.</div>
          )}
        </div>

        {/* 🔴 POPUP BANK DETAILS */}
        {selectedBank && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedBank(null)}></div>
            <div className="bg-white dark:bg-[#1C1C1E] backdrop-blur-2xl w-full max-w-sm rounded-[32px] p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
              
              <button onClick={() => setSelectedBank(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="text-center mb-6">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner"
                  style={{ background: generateMeshGradient(selectedBank.name) }}
                >
                  <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">{selectedBank.name}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Payment Details</p>
              </div>

              <div className="bg-gray-50 dark:bg-[#0A0A0A] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Bank Name</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBank.bank_name || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Account Number</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-wider font-mono">{selectedBank.bank_account || "Not provided"}</p>
                    {selectedBank.bank_account && (
                      <button onClick={() => handleCopyBank(selectedBank.bank_account)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 active:scale-90 transition-all shadow-sm" title="Copy Account Number">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}