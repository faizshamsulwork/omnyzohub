"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ==========================================
// TEMPLATE TERMA & SYARAT (T&C)
// ==========================================
const tcTemplates = {
  standard: "1. This quotation is valid for the period stated above.\n2. Prices are subject to change upon revision of project scope.\n3. To proceed, please reply with your confirmation or a signed Purchase Order (PO).",
  deposit50: "1. A 50% non-refundable deposit is required before commencement of work.\n2. The remaining 50% balance is due upon project completion/handover.\n3. Prices are subject to change upon revision of project scope.\n4. This quotation is valid for the period stated above.",
  retainer: "1. This is a monthly retainer agreement.\n2. Invoices will be issued on the 1st of every month, with 7-day payment terms.\n3. Either party may terminate this agreement with a 30-day written notice.\n4. Unused deliverables do not roll over to the next month."
};

export default function NewQuotationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    client_name: "", quote_no: "Generating...", 
    date: new Date().toISOString().split('T')[0], validity: "30", valid_until: "",
    notes: "", terms: tcTemplates.standard // Default guna Standard
  });
  const [clientInfo, setClientInfo] = useState({ pic_name: "", phone: "", email: "", address: "" });
  
  const [items, setItems] = useState([
    { id: Date.now(), type: 'title', description: "", qty: 1, price: 0, taxRate: 0, total: 0 }
  ]);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: contactData } = await supabase.from("contacts").select("*").eq("contact_type", "Customer");
      if (contactData) {
        setContacts(contactData);
        if (contactData.length > 0) handleClientSelect(contactData[0].name, contactData);
      }
      
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      const prefix = `QU${dateStr}-`;

      const { data: lastQuote } = await supabase.from("quotations").select("quote_no").like("quote_no", `${prefix}%`).order("created_at", { ascending: false }).limit(1);

      if (lastQuote && lastQuote.length > 0 && lastQuote[0].quote_no) {
        const lastNum = parseInt(lastQuote[0].quote_no.split('-')[1]);
        const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
        setFormData(p => ({ ...p, quote_no: `${prefix}${nextNum.toString().padStart(3, '0')}` }));
      } else {
        setFormData(p => ({ ...p, quote_no: `${prefix}001` }));
      }
    };
    fetchInitialData();
  }, []);

  const handleClientSelect = (clientName: string, contactList = contacts) => {
    const client = contactList.find(c => c.name === clientName);
    setFormData(prev => ({ ...prev, client_name: clientName }));
    if (client) {
      setClientInfo({
        pic_name: client.pic_name || "", phone: client.phone || "", email: client.email || "",
        address: `${client.address || ""}, ${client.postcode || ""} ${client.city || ""}, ${client.state || ""}`
      });
    }
  };

  useEffect(() => {
    if (formData.date && formData.validity) {
      const d = new Date(formData.date);
      d.setDate(d.getDate() + parseInt(formData.validity));
      setFormData(prev => ({ ...prev, valid_until: d.toISOString().split('T')[0] }));
    }
  }, [formData.date, formData.validity]);

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    const val = typeof value === 'string' ? value : Number(value);
    newItems[index] = { ...newItems[index], [field]: val };
    
    if (field === 'qty' || field === 'price') {
      newItems[index].total = Number(newItems[index].qty) * Number(newItems[index].price);
    }
    setItems(newItems);
  };
  
  const addItem = () => setItems([...items, { id: Date.now(), type: 'item', description: "", qty: 1, price: 0, taxRate: 0, total: 0 }]);
  const addTitle = () => setItems([...items, { id: Date.now(), type: 'title', description: "", qty: 0, price: 0, taxRate: 0, total: 0 }]);
  const removeItem = (id: number) => setItems(items.filter(item => item.id !== id));

  const subtotal = items.filter(i => i.type === 'item').reduce((sum, item) => sum + item.total, 0);
  const totalTaxAmount = items.filter(i => i.type === 'item').reduce((sum, item) => sum + (item.total * ((item.taxRate || 0) / 100)), 0);
  const grandTotal = (subtotal - discount) + totalTaxAmount;

  const nextStep = () => {
    if (step === 1 && !formData.client_name) {
      alert("Please select a customer.");
      return;
    }
    setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);

  const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      addItem(); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step !== 3) {
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("quotations").insert([{
      quote_no: formData.quote_no, client_name: formData.client_name,
      date: formData.date, valid_until: formData.valid_until,
      items: items, subtotal: subtotal, discount: discount, tax_amount: totalTaxAmount, total: grandTotal,
      notes: formData.notes, terms: formData.terms, status: "Draft"
    }]);

    if (!error) {
      router.push("/quotations");
      router.refresh();
    } else {
      alert("Error saving quotation");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 relative z-10 transition-colors duration-500">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/quotations" className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white mb-2 inline-block transition-colors">&larr; Back to Quotations</Link>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">New Quotation</h1>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step === num ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : step > num ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'}`}>
                  {step > num ? '✓' : num}
                </div>
                {num < 3 && <div className={`w-10 h-1 rounded-full ${step > num ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-200 dark:bg-gray-800'}`}></div>}
              </div>
            ))}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl p-8 md:p-10 rounded-[32px] shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors duration-500">
          
          {/* ================= STEP 1 ================= */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4">Quotation Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Customer *</label>
                  <select required className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none" value={formData.client_name} onChange={e => handleClientSelect(e.target.value)}>
                    {contacts.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Quote No.</label>
                  <input type="text" className={`w-full p-4 border border-transparent rounded-xl cursor-not-allowed font-bold ${formData.quote_no === "Generating..." ? "bg-blue-50 text-blue-500 animate-pulse" : "bg-gray-100 dark:bg-[#151515] text-gray-900 dark:text-white"}`} value={formData.quote_no} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Date *</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Validity</label>
                  <select className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none" value={formData.validity} onChange={e => setFormData({...formData, validity: e.target.value})}>
                    <option value="14">14 Days</option><option value="30">30 Days</option><option value="60">60 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Valid Until</label>
                  <input type="date" className="w-full p-4 bg-gray-100 dark:bg-[#151515] border border-transparent rounded-xl text-gray-500 cursor-not-allowed" value={formData.valid_until} readOnly />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0A0A0A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Client Info (Auto-filled)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">PIC Name:</span> <span className="font-semibold text-gray-900 dark:text-white">{clientInfo.pic_name || "-"}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-semibold text-gray-900 dark:text-white">{clientInfo.phone || "-"}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-semibold text-gray-900 dark:text-white">{clientInfo.email || "-"}</span></div>
                  <div className="md:col-span-2"><span className="text-gray-500">Address:</span> <span className="font-semibold text-gray-900 dark:text-white">{clientInfo.address !== ",  , " ? clientInfo.address : "-"}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2 ================= */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Items & Pricing</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={addTitle} className="text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-full hover:scale-105 transition-transform">+ ADD TITLE</button>
                  <button type="button" onClick={addItem} className="text-xs font-bold bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-4 py-2 rounded-full hover:scale-105 transition-transform">+ ADD ITEM</button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="hidden md:flex gap-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex-1">Description</div>
                  <div className="w-16 text-center">Qty</div>
                  <div className="w-28 text-right">Price (RM)</div>
                  <div className="w-20 text-center">Tax</div>
                  <div className="w-28 text-right">Amount</div>
                  <div className="w-8"></div>
                </div>
                
                {items.map((item, index) => (
                  item.type === 'title' ? (
                    <div key={item.id} className="flex items-center bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 transition-colors">
                      <div className="flex-1 w-full">
                        <input 
                          type="text" placeholder="Section Title (e.g. Phase 1: Research)" required 
                          className="w-full bg-transparent border-none text-sm font-bold text-blue-700 dark:text-blue-400 focus:ring-0 p-2" 
                          value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                          onKeyDown={handleEnterKey}
                        />
                      </div>
                      {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 w-8 text-center">&times;</button>}
                    </div>
                  ) : (
                    <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 dark:bg-[#0A0A0A] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 transition-colors">
                      <div className="flex-1 w-full">
                        <textarea placeholder="Item description" required rows={3} className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none p-3 resize-y" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)}></textarea>
                      </div>
                      <div className="w-full md:w-16"><input type="number" placeholder="Qty" required min="1" className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white focus:ring-0 p-0 text-left md:text-center" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} onKeyDown={handleEnterKey} /></div>
                      <div className="w-full md:w-28"><input type="number" placeholder="Price" required step="0.01" className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white focus:ring-0 p-0 text-left md:text-right" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} onKeyDown={handleEnterKey} /></div>
                      
                      <div className="w-full md:w-20">
                        <select className="w-full bg-gray-200 dark:bg-gray-800 rounded-lg border-none text-sm text-gray-900 dark:text-white focus:ring-0 p-2 text-center cursor-pointer appearance-none" value={item.taxRate} onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}>
                          <option value="0">0%</option>
                          <option value="6">6%</option>
                          <option value="8">8%</option>
                        </select>
                      </div>

                      <div className="w-full md:w-28 text-left md:text-right text-sm font-bold text-gray-900 dark:text-white">RM {item.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
                      {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 w-8 text-center pt-2 md:pt-0">&times;</button>}
                    </div>
                  )
                ))}
              </div>

              <div className="flex justify-end pt-6">
                <div className="w-full md:w-80 bg-gray-50 dark:bg-[#0A0A0A] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Subtotal</span><span className="text-gray-900 dark:text-white font-semibold">RM {subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Discount (RM)</span>
                    <input type="number" step="0.01" className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Total Tax</span>
                    <span className="text-gray-900 dark:text-white font-semibold">RM {totalTaxAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-4 flex justify-between items-end">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Total</span><span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">RM {grandTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3 ================= */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4">Notes & Terms</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Notes (Internal or extra details)</label>
                <textarea rows={3} className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..."></textarea>
              </div>

              {/* DROPDOWN TEMPLATE T&C */}
              <div className="pt-4">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-gray-500">Terms & Conditions</label>
                  <select 
                    className="bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setFormData({ ...formData, terms: tcTemplates[e.target.value as keyof typeof tcTemplates] });
                      }
                    }}
                  >
                    <option value="custom">Load Template...</option>
                    <option value="standard">Standard Quote Terms</option>
                    <option value="deposit50">Requires 50% Deposit</option>
                    <option value="retainer">Monthly Retainer</option>
                  </select>
                </div>
                
                {/* TEXTAREA T&C (Boleh di-edit) */}
                <textarea 
                  rows={6} 
                  required 
                  className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors leading-relaxed" 
                  value={formData.terms} 
                  onChange={e => setFormData({...formData, terms: e.target.value})}
                ></textarea>
                <p className="text-xs text-gray-400 mt-2">* You can edit the generated template above directly.</p>
              </div>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between">
            {step > 1 ? <button type="button" onClick={prevStep} className="px-8 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">&larr; Back</button> : <div></div>}
            
            {step < 3 ? (
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); nextStep(); }} 
                className="px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                Continue &rarr;
              </button>
            ) : (
              <button type="submit" disabled={loading} className="px-10 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-500 rounded-full shadow-lg shadow-green-500/30 transition-all active:scale-95 disabled:opacity-50">
                {loading ? "Creating..." : "Finish & Create Quotation"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}