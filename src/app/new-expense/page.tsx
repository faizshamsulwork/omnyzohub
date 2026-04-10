"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function NewExpense() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "", // FIX: Ditukar dari 'title' ke 'description' ikut nama kolum database
    amount: "", 
    category: "Software & Tools *", 
    date: new Date().toISOString().split('T')[0], 
    receipt_url: ""
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    setUploadingImage(true);
    const toastId = toast.loading("Uploading receipt...");

    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`, { id: toastId });
      setUploadingImage(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    setFormData({ ...formData, receipt_url: publicUrlData.publicUrl });
    
    toast.success("Receipt uploaded successfully!", { id: toastId });
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("Saving expense...");

    // FIX: Hantar ke database guna nama kolum yang betul (description)
    const { error } = await supabase.from("expenses").insert([{
      description: formData.description, 
      amount: parseFloat(formData.amount), 
      category: formData.category, 
      date: formData.date, 
      receipt_url: formData.receipt_url || null
    }]);

    if (!error) {
      toast.success("Expense recorded.", { id: loadingToast });
      router.push("/expenses");
      router.refresh();
    } else {
      toast.error(`Failed to save: ${error.message}`, { id: loadingToast });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 md:p-12 flex items-center justify-center relative z-10 transition-colors">
      <div className="w-full max-w-2xl bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl p-10 rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors">
        
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">Record Expense</h1>
        <p className="text-gray-500 mb-8">Track your cashflow and save tax receipts.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Description / Title *</label>
            <input 
              type="text" 
              required 
              className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
              placeholder="e.g. Adobe Creative Cloud" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Amount (RM) *</label>
              <input 
                type="number" 
                step="0.01" 
                required 
                className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
                placeholder="0.00" 
                value={formData.amount} 
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Date *</label>
              <input 
                type="date" 
                required 
                className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
                value={formData.date} 
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Category *</label>
              <select 
                className="w-full p-4 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white" 
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Software & Tools *">Software & Tools *</option>
                <option value="Advertising & Marketing *">Advertising & Marketing *</option>
                <option value="Professional Fees (Vendors) *">Professional Fees (Vendors) *</option>
                <option value="Telecommunication & Internet *">Telecommunication & Internet *</option>
                <option value="Client Entertainment (50%) *">Client Entertainment (50%) *</option>
                <option value="Office Supplies & Equipment *">Office Supplies & Equipment *</option>
                <option value="Travel & Transportation *">Travel & Transportation *</option>
                <option value="Rental & Utilities *">Rental & Utilities *</option>
                <option value="Owner Drawings (Non-Taxable)">Owner Drawings (Personal)</option>
                <option value="Other">Other Expenses</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-2 font-medium">
                <span className="text-blue-500 font-bold">*</span> Indicates expenses generally tax-deductible under LHDN guidelines.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Attach Receipt (Tax Purpose)</label>
              
              {formData.receipt_url ? (
                <div className="w-full h-14 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400">
                  ✓ Receipt Attached
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1 h-14 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-500 transition-colors flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
                    <input 
                      type="file" 
                      accept="image/*, application/pdf" 
                      onChange={handleFileUpload} 
                      disabled={uploadingImage} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                    />
                    <span className="text-xs font-bold text-gray-500">{uploadingImage ? "..." : "Upload"}</span>
                  </div>

                  <div className="relative flex-1 h-14 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleFileUpload} 
                      disabled={uploadingImage} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Snap
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Link href="/expenses" className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 flex items-center">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={loading || uploadingImage} 
              className="bg-blue-600 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}