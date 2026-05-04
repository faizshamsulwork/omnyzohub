"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // 🔴 IMPORT TOAST UNTUK NOTIFICATION

export default function AssetsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // 🔴 STATE BARU UNTUK QUICK UPLOAD
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Form States
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("ICT Equipment (3 Years)");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  // 🔴 FUNGSI QUICK UPLOAD DARI DALAM JADUAL (MACAM EXPENSES)
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    setUploadingId(id);
    const toastId = toast.loading("Uploading asset receipt...");

    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`, { id: toastId });
      setUploadingId(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    
    const { error: updateError } = await supabase
      .from('assets')
      .update({ receipt_url: publicUrlData.publicUrl })
      .eq('id', id);

    if (!updateError) {
      toast.success("Receipt attached successfully!", { id: toastId });
      fetchData();
    } else {
      toast.error(`Database error: ${updateError.message}`, { id: toastId });
    }
    setUploadingId(null);
  };

  // 🔴 FUNGSI SUBMIT DIPERBAIKI: HANTAR GAMBAR KE SUPABASE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Saving new asset...");

    let receiptUrl = null;

    // Kalau user ada attach gambar resit masa isi form
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
      
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = publicUrlData.publicUrl;
      }
    }

    const newAsset = {
      item_name: itemName,
      category: category,
      purchase_date: purchaseDate,
      amount: parseFloat(amount),
      notes: notes,
      receipt_url: receiptUrl // 🔴 Simpan URL resit
    };

    const { error } = await supabase.from('assets').insert([newAsset]);

    if (!error) {
      toast.success("Asset saved successfully!", { id: toastId });
      setItemName("");
      setCategory("ICT Equipment (3 Years)");
      setPurchaseDate("");
      setAmount("");
      setNotes("");
      setReceiptFile(null); 
      setShowForm(false);
      fetchData();
    } else {
      toast.error("Error saving asset: " + error.message, { id: toastId });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      const toastId = toast.loading("Deleting asset...");
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (!error) {
        toast.success("Asset deleted.", { id: toastId });
        fetchData();
      } else {
        toast.error("Failed to delete.", { id: toastId });
      }
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
    <div className="min-h-screen p-8 md:p-12 relative transition-colors duration-500 pb-32">
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

                <div className="md:col-span-2 mt-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Attach Receipt (Tax Purpose)</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    
                    <input type="file" id="upload-receipt" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                    <input type="file" id="snap-receipt" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                    
                    <label htmlFor="upload-receipt" className="flex-1 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all rounded-xl py-4 flex justify-center items-center font-bold text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                      Upload
                    </label>
                    
                    <label htmlFor="snap-receipt" className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 transition-all rounded-xl py-4 flex justify-center items-center font-bold text-sm text-white gap-2 shadow-lg shadow-blue-500/30">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Snap
                    </label>
                  </div>
                  
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

        <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-8 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
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
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Value (RM)</th>
                    {/* 🔴 LAJUR BARU UNTUK DOCUMENTS */}
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Documents</th>
                    <th className="pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="group border-b border-gray-100 dark:border-gray-900/50 hover:bg-white dark:hover:bg-[#1A1A1C] hover:shadow-lg hover:shadow-gray-200/30 dark:hover:shadow-black/40 transition-all duration-300 cursor-default rounded-2xl">
                      
                      <td className="py-5 px-4 rounded-l-2xl w-1/3">
                        <p className="font-bold text-sm text-gray-900 dark:text-white max-w-[200px] md:max-w-[300px] truncate" title={asset.item_name}>
                          {asset.item_name}
                        </p>
                        {asset.notes && (
                          <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] md:max-w-[300px] truncate" title={asset.notes}>
                            {asset.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-5 px-4">
                        <span 
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10 transition-colors duration-300 max-w-[150px] truncate" 
                          title={asset.category}
                        >
                          {asset.category}
                        </span>
                      </td>

                      <td className="py-5 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {new Date(asset.purchase_date).toLocaleDateString('en-GB')}
                      </td>

                      <td className="py-5 px-4 text-sm font-black text-right text-gray-900 dark:text-white">
                        RM {Number(asset.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 🔴 SEL BARU UNTUK QUICK UPLOAD / VIEW RESIT */}
                      <td className="py-5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {asset.receipt_url ? (
                            <a href={asset.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:scale-110 transition-transform" title="View Asset Receipt">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </a>
                          ) : (
                            <div className="relative p-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center justify-center group" title="Quick Attach Receipt">
                              <input 
                                type="file" 
                                accept="image/*, application/pdf" 
                                onChange={(e) => handleQuickUpload(e, asset.id)} 
                                disabled={uploadingId === asset.id} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                              />
                              {uploadingId === asset.id ? (
                                <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              ) : (
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-5 px-4 text-right rounded-r-2xl">
                        <div className="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex justify-end">
                          <button 
                            onClick={() => handleDelete(asset.id)} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm active:scale-95" 
                            title="Delete Asset"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
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