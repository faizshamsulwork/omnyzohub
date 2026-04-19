"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function AssetsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form States
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("ICT Equipment (3 Years)");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  
  // State Baru untuk Resit
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    setUserEmail(email);

    if (email && email !== "faiz@omnyzo.com") {
      router.push("/");
      return;
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('purchase_date', { ascending: false });

    if (data) setAssets(data);
    setIsLoading(false);
  };

  // Fungsi handle file bila user tekan Upload atau Snap
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Nota: Kalau nak fail ni betul-betul save dalam database, 
    // kau kena setup Supabase Storage Bucket (contoh: 'receipts').
    // Buat masa ni, kita masukkan data teks dulu supaya sistem tak error.

    const newAsset = {
      item_name: itemName,
      category: category,
      purchase_date: purchaseDate,
      amount: parseFloat(amount),
      notes: notes,
      // receipt_url: URL dari Supabase Storage (bila dah setup nanti)
    };

    const { error } = await supabase.from('assets').insert([newAsset]);

    if (!error) {
      // Reset Form
      setItemName("");
      setCategory("ICT Equipment (3 Years)");
      setPurchaseDate("");
      setAmount("");
      setNotes("");
      setReceiptFile(null); // Reset file
      setShowForm(false);
      fetchData();
    } else {
      alert("Error saving asset: " + error.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      await supabase.from('assets').delete().eq('id', id);
      fetchData();
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Assets...</div>;
  }

  const totalAssets = assets.reduce((sum, asset) => sum + Number(asset.amount), 0);
  const smallValueAssets = assets
    .filter(asset => Number(asset.amount) <= 2000 || asset.category.includes('Small Value'))
    .reduce((sum, asset) => sum + Number(asset.amount), 0);
  const capitalAllowanceAssets = assets
    .filter(asset => Number(asset.amount) > 2000 && !asset.category.includes('Small Value'))
    .reduce((sum, asset) => sum + Number(asset.amount), 0);

  return (
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Company Assets</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
              Manage equipment, gadgets, and calculate tax deductions.
            </p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            {showForm ? "Close Form" : "+ Add New Asset"}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 rounded-[24px] border border-gray-200 dark:border-gray-800">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Assets Value</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white">RM {totalAssets.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl p-6 rounded-[24px] border border-amber-200 dark:border-amber-900/30">
            <h3 className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>⚡</span> 100% Claimable This Year
            </h3>
            <p className="text-3xl font-black text-amber-700 dark:text-amber-400">RM {smallValueAssets.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl p-6 rounded-[24px] border border-blue-200 dark:border-blue-900/30">
            <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>📊</span> Capital Allowance
            </h3>
            <p className="text-3xl font-black text-blue-700 dark:text-blue-400">RM {capitalAllowanceAssets.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl p-8 rounded-[32px] border border-gray-200 dark:border-gray-800 mb-12 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">Register New Asset</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Item Name (e.g., MacBook M4 Pro)</label>
                  <input required type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">LHDN Category</label>
                  <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none">
                    <option className="dark:bg-[#111]">ICT Equipment (3 Years)</option>
                    <option className="dark:bg-[#111]">Plant & Machinery (6 Years)</option>
                    <option className="dark:bg-[#111]">Office Furniture & Fittings (8 Years)</option>
                    <option className="dark:bg-[#111]">Small Value Asset (&lt; RM2,000)</option>
                    <option className="dark:bg-[#111]">Motor Vehicle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Purchase Date</label>
                  <input required type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Market Value / Amount (RM)</label>
                  <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" placeholder="0.00" />
                </div>

                {/* RUANGAN BARU: UPLOAD / SNAP RESIT */}
                <div className="md:col-span-2 mt-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Attach Receipt (Tax Purpose)</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    
                    {/* Hidden Inputs */}
                    <input type="file" id="upload-receipt" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                    <input type="file" id="snap-receipt" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                    
                    {/* Butang Upload */}
                    <label htmlFor="upload-receipt" className="flex-1 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all rounded-xl py-4 flex justify-center items-center font-bold text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                      Upload
                    </label>
                    
                    {/* Butang Snap */}
                    <label htmlFor="snap-receipt" className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 transition-all rounded-xl py-4 flex justify-center items-center font-bold text-sm text-white gap-2 shadow-lg shadow-blue-500/30">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Snap
                    </label>
                  </div>
                  
                  {/* Tunjuk nama fail kalau dah berjaya pilih */}
                  {receiptFile && (
                    <div className="mt-3 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg inline-block">
                      ✓ Selected: {receiptFile.name}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all" placeholder="e.g., Trade-in old M1 Pro, Bought from Machines" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? "Saving..." : "Save Asset"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-8 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-lg">
          <h2 className="text-xl font-bold mb-6">Registered Assets</h2>
          
          {assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No assets registered yet.</p>
              <p className="text-sm mt-2">Start adding your equipment to track deductions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Item Name</th>
                    <th className="pb-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Category</th>
                    <th className="pb-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="pb-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Value (RM)</th>
                    <th className="pb-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-sm">{asset.item_name}</p>
                        {asset.notes && <p className="text-[11px] text-gray-500 mt-1">{asset.notes}</p>}
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(asset.purchase_date).toLocaleDateString('en-GB')}</td>
                      <td className="py-4 text-sm font-bold text-right">
                        {Number(asset.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right">
                        <button onClick={() => handleDelete(asset.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}