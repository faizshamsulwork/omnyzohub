"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const invoiceTemplates = {
  standard: "1. Unless specified, Agency Fee is payable within 30 days from invoice date.\n2. The Agency reserves the right to suspend any Services in the event of delay in payment.\n3. Please indicate the invoice number as reference when transferring the funds.\n4. Payment advice should be sent to billings@omnyzo.com.",
  immediate: "1. Payment is due immediately upon receipt of this invoice.\n2. Please indicate the invoice number as reference when transferring the funds.\n3. Payment advice should be sent to billings@omnyzo.com.",
  milestone: "1. This invoice represents a milestone payment (e.g. 50% Deposit) as agreed in the Quotation.\n2. Work will commence upon clearance of this payment.\n3. Please indicate the invoice number as reference when transferring the funds."
};

export default function NewInvoiceWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactTypeFilter, setContactTypeFilter] = useState("Customer");
  
  const [formData, setFormData] = useState({
    client_name: "", client_pic: "", client_phone: "", client_email: "", client_address: "",
    invoice_no: "Generating...", status: "outstanding", credit_term: "14", notes: "", terms: invoiceTemplates.standard
  });
  
  const [items, setItems] = useState([{ id: Date.now(), type: 'title', description: "", qty: 1, price: 0, taxRate: 0, total: 0 }]);
  // 🔴 FIX: Tambah sistem Diskaun
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: contactData } = await supabase.from("contacts").select("*").order("name", { ascending: true });
      if (contactData) {
        setContacts(contactData);
        const filtered = contactData.filter(c => c.contact_type === contactTypeFilter);
        if (filtered.length > 0) handleClientSelect(filtered[0].name, contactData);
      }
      
      const today = new Date();
      const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
      const prefix = `${dateStr}-SV`;
      const { data: lastInvoice } = await supabase.from("invoices").select("invoice_no").like("invoice_no", `${prefix}%`).order("created_at", { ascending: false }).limit(1);

      if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].invoice_no) {
        const lastNum = parseInt(lastInvoice[0].invoice_no.split('-SV')[1]);
        setFormData(p => ({ ...p, invoice_no: `${prefix}${String(isNaN(lastNum) ? 1 : lastNum + 1).padStart(2, '0')}` }));
      } else {
        setFormData(p => ({ ...p, invoice_no: `${prefix}01` }));
      }
    };
    fetchInitialData();
  }, [contactTypeFilter]);

  const handleClientSelect = (clientName: string, contactList = contacts) => {
    const client = contactList.find(c => c.name === clientName);
    if (client) {
      setFormData(prev => ({ 
        ...prev, client_name: clientName, client_pic: client.pic_name || "", client_phone: client.phone || "",
        client_email: client.email || "", client_address: [client.address, client.postcode, client.city, client.state].filter(Boolean).join(", ") || ""
      }));
    } else {
      setFormData(prev => ({ ...prev, client_name: clientName, client_pic: "", client_phone: "", client_email: "", client_address: "" }));
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    const val = typeof value === 'string' ? value : Number(value);
    newItems[index] = { ...newItems[index], [field]: val };
    if (field === 'qty' || field === 'price') newItems[index].total = Number(newItems[index].qty) * Number(newItems[index].price);
    setItems(newItems);
  };
  
  const addItem = () => setItems([...items, { id: Date.now(), type: 'item', description: "", qty: 1, price: 0, taxRate: 0, total: 0 }]);
  const addTitle = () => setItems([...items, { id: Date.now(), type: 'title', description: "", qty: 0, price: 0, taxRate: 0, total: 0 }]);
  const removeItem = (id: number) => setItems(items.filter(item => item.id !== id));

  const subtotal = items.filter(i => i.type === 'item').reduce((sum, item) => sum + item.total, 0);
  const totalTaxAmount = items.filter(i => i.type === 'item').reduce((sum, item) => sum + (item.total * ((item.taxRate || 0) / 100)), 0);
  // 🔴 FIX: Kira tolak diskaun
  const grandTotal = (subtotal - discount) + totalTaxAmount;

  const nextStep = () => {
    if (step === 1 && !formData.client_name) return toast.error("Please select a contact.");
    setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);
  
  // 🔴 FIX: Shift+Enter support
  const handleEnterKey = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); }
  };
  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;

    setLoading(true);
    const loadingToast = toast.loading("Saving invoice...");

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + Number(formData.credit_term));
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    const { error } = await supabase.from("invoices").insert([{
      invoice_no: formData.invoice_no, 
      client_name: formData.client_name, 
      client_pic: formData.client_pic,
      client_address: formData.client_address,
      client_phone: formData.client_phone,
      client_email: formData.client_email,
      description: "Creative Services", 
      amount: grandTotal, 
      items: items,             // 🔴 FIX: Simpan Items dalam database
      subtotal: subtotal,       // 🔴 FIX: Simpan Subtotal
      discount: discount,       // 🔴 FIX: Simpan Discount
      tax_amount: totalTaxAmount,// 🔴 FIX: Simpan Tax
      status: formData.status,
      due_date: formattedDueDate,
      notes: formData.notes,      
      terms: formData.terms       
    }]);

    if (!error) {
      toast.success(`Invoice ${formData.invoice_no} saved successfully.`, { id: loadingToast });
      router.push("/invoices");
      router.refresh();
    } else {
      toast.error(`Error saving invoice: ${error.message}`, { id: loadingToast });
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => c.contact_type === contactTypeFilter);

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 relative z-10 transition-colors duration-500">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/invoices" className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white mb-2 inline-block transition-colors">&larr; Back to Invoices</Link>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">New Invoice</h1>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step === num ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : step > num ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'}`}>{step > num ? '✓' : num}</div>
                {num < 3 && <div className={`w-10 h-1 rounded-full ${step > num ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-200 dark:bg-gray-800'}`}></div>}
              </div>
            ))}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl p-8 md:p-10 rounded-[32px] shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors duration-500">
          
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4">Invoice Details</h2>
              <div className="bg-gray-50 dark:bg-[#0A0A0A] p-2 rounded-xl border border-gray-200 dark:border-gray-800 flex inline-flex w-full md:w-auto">
                <button type="button" onClick={() => setContactTypeFilter("Customer")} className={`flex-1 md:w-40 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${contactTypeFilter === "Customer" ? "bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Billed to Customer</button>
                <button type="button" onClick={() => setContactTypeFilter("Freelancer")} className={`flex-1 md:w-40 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${contactTypeFilter === "Freelancer" ? "bg-white dark:bg-gray-800 shadow-sm text-purple-600 dark:text-purple-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Pay to Freelancer</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Select {contactTypeFilter} *</label>
                  <select required className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none" value={formData.client_name} onChange={e => handleClientSelect(e.target.value)}>
                    {filteredContacts.length === 0 && <option value="">No {contactTypeFilter.toLowerCase()}s found.</option>}
                    {filteredContacts.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                  
                  {formData.client_name && (
                    <div className="mt-4 p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl animate-in fade-in duration-300">
                      <h4 className="text-[10px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest mb-3">Client Details Auto-Filled</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">ATTN:</span> <span className="font-bold text-gray-900 dark:text-white">{formData.client_pic || "-"}</span></div>
                        <div><span className="text-gray-500">Email:</span> <span className="font-bold text-gray-900 dark:text-white">{formData.client_email || "-"}</span></div>
                        <div><span className="text-gray-500">Phone:</span> <span className="font-bold text-gray-900 dark:text-white">{formData.client_phone || "-"}</span></div>
                        <div className="md:col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900 dark:text-white">{formData.client_address || "-"}</span></div>
                      </div>
                    </div>
                  )}
                </div>
                <div><label className="block text-sm font-medium text-gray-500 mb-2">Invoice No.</label><input type="text" className="w-full p-4 bg-gray-100 dark:bg-[#151515] border border-transparent rounded-xl cursor-not-allowed font-bold text-gray-900 dark:text-white" value={formData.invoice_no} readOnly /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Credit Terms (Due Date) *</label>
                  <select className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none" value={formData.credit_term} onChange={e => setFormData({...formData, credit_term: e.target.value})}>
                    <option value="0">Due on Receipt (Immediate)</option><option value="7">7 Days</option><option value="14">14 Days</option><option value="30">30 Days</option><option value="60">60 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Payment Status *</label>
                  <select className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="outstanding">Outstanding (Pending)</option><option value="paid">Paid (Completed)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Line Items</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={addTitle} className="text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-full hover:scale-105 transition-transform">+ ADD TITLE</button>
                  <button type="button" onClick={addItem} className="text-xs font-bold bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-4 py-2 rounded-full hover:scale-105 transition-transform">+ ADD ITEM</button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="hidden md:flex gap-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest"><div className="flex-1">Description</div><div className="w-16 text-center">Qty</div><div className="w-28 text-right">Price (RM)</div><div className="w-20 text-center">Tax</div><div className="w-28 text-right">Amount</div><div className="w-8"></div></div>
                {items.map((item, index) => (
                  item.type === 'title' ? (
                    <div key={item.id} className="flex items-start bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <div className="flex-1 w-full">
                        <textarea placeholder="Section Title (Use Shift+Enter for new line)" required rows={1} className="w-full bg-transparent border-none text-sm font-bold text-blue-700 dark:text-blue-400 focus:ring-0 p-2 resize-none overflow-hidden" value={item.description} onChange={(e) => { autoResize(e); handleItemChange(index, 'description', e.target.value); }} onKeyDown={handleEnterKey} />
                      </div>
                      {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 w-8 text-center pt-2">&times;</button>}
                    </div>
                  ) : (
                    <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 dark:bg-[#0A0A0A] p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                      <div className="flex-1 w-full">
                        <textarea placeholder="- Item description&#10;- Support bullet points (Shift+Enter)" required rows={2} className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none p-3 resize-y" value={item.description} onChange={(e) => { autoResize(e); handleItemChange(index, 'description', e.target.value); }} onKeyDown={handleEnterKey}></textarea>
                      </div>
                      <div className="w-full md:w-16"><input type="number" placeholder="Qty" required min="1" className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white focus:ring-0 p-0 text-left md:text-center" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} onKeyDown={handleEnterKey} /></div>
                      <div className="w-full md:w-28"><input type="number" placeholder="Price" required step="0.01" className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white focus:ring-0 p-0 text-left md:text-right" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} onKeyDown={handleEnterKey} /></div>
                      <div className="w-full md:w-20"><select className="w-full bg-gray-200 dark:bg-gray-800 rounded-lg border-none text-sm text-gray-900 dark:text-white focus:ring-0 p-2 text-center cursor-pointer appearance-none" value={item.taxRate} onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}><option value="0">0%</option><option value="6">6%</option><option value="8">8%</option></select></div>
                      <div className="w-full md:w-28 text-left md:text-right text-sm font-bold text-gray-900 dark:text-white">RM {item.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
                      {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 w-8 text-center pt-2 md:pt-0">&times;</button>}
                    </div>
                  )
                ))}
              </div>
              <div className="flex justify-end pt-6">
                <div className="w-full md:w-80 bg-gray-50 dark:bg-[#0A0A0A] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Subtotal</span><span className="text-gray-900 dark:text-white font-semibold">RM {subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Discount (RM)</span><input type="number" step="0.01" className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Total Tax</span><span className="text-gray-900 dark:text-white font-semibold">RM {totalTaxAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-4 flex justify-between items-end"><span className="text-gray-500 font-bold uppercase tracking-wider">Total</span><span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">RM {grandTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4">Notes & Terms</h2>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Notes (Internal or extra details)</label>
                <textarea rows={3} className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..."></textarea>
              </div>
              <div className="pt-4">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-gray-500">Terms & Conditions</label>
                  <select 
                    className="bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value !== "custom") setFormData({ ...formData, terms: invoiceTemplates[e.target.value as keyof typeof invoiceTemplates] });
                    }}
                  >
                    <option value="custom">Load Template...</option><option value="standard">Standard (30 Days)</option><option value="immediate">Due on Receipt (Immediate)</option><option value="milestone">Milestone Deposit (50%)</option>
                  </select>
                </div>
                <textarea rows={5} required className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors leading-relaxed" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})}></textarea>
              </div>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between">
            {step > 1 ? <button type="button" onClick={prevStep} className="px-8 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">&larr; Back</button> : <div></div>}
            {step < 3 ? (
              <button type="button" onClick={(e) => { e.preventDefault(); nextStep(); }} className="px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-500/30 transition-all active:scale-95">Continue &rarr;</button>
            ) : (
              <button type="submit" disabled={loading} className="px-10 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-500 rounded-full shadow-lg shadow-green-500/30 transition-all active:scale-95 disabled:opacity-50">{loading ? "Generating..." : "Generate Invoice"}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}