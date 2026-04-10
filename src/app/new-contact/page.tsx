"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewContact() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"Customer" | "Freelancer">("Customer"); 

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "+60", service_role: "", bank_name: "", bank_account: "",
    customer_type: "Company", pic_name: "", tin_no: "", ssm_no: "", address: "", postcode: "", city: "", state: "", country: "Malaysia"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contacts").insert([{
      contact_type: type, name: formData.name, email: formData.email, phone: formData.phone,
      service_role: type === "Freelancer" ? formData.service_role : null,
      bank_name: type === "Freelancer" ? formData.bank_name : null,
      bank_account: type === "Freelancer" ? formData.bank_account : null,
      customer_type: type === "Customer" ? formData.customer_type : null,
      pic_name: type === "Customer" ? formData.pic_name : null,
      tin_no: type === "Customer" ? formData.tin_no : null,
      ssm_no: type === "Customer" ? formData.ssm_no : null,
      address: type === "Customer" ? formData.address : null,
      postcode: type === "Customer" ? formData.postcode : null,
      city: type === "Customer" ? formData.city : null,
      state: type === "Customer" ? formData.state : null,
      country: type === "Customer" ? formData.country : null,
    }]);

    if (!error) {
      router.push("/contacts"); router.refresh();
    } else {
      alert("Failed to save contact"); setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 md:p-12 flex items-center justify-center relative z-10">
      <div className="w-full max-w-3xl bg-white dark:bg-[#151517] p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-500">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-wide transition-colors">Add {type}</h1>
          <Link href="/contacts" className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-bold">×</span>
          </Link>
        </div>

        <div className="flex space-x-2 mb-8 bg-gray-100 dark:bg-[#0A0A0A] p-1 rounded-xl w-fit border border-gray-200 dark:border-gray-800 transition-colors">
            <button type="button" onClick={() => setType("Customer")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${type === "Customer" ? "bg-white dark:bg-[#1d1d1f] text-black dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Customer</button>
            <button type="button" onClick={() => setType("Freelancer")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${type === "Freelancer" ? "bg-white dark:bg-[#1d1d1f] text-black dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Freelancer</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {type === "Freelancer" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Name / Company *</label>
                <input type="text" name="name" required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Phone *</label>
                  <input type="text" name="phone" required value={formData.phone} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Email</label>
                  <input type="email" name="email" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Service / Role</label>
                <input type="text" name="service_role" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Bank Info *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select name="bank_name" required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors" onChange={handleChange}>
                    <option value="">Select Bank...</option><option value="Maybank">Maybank</option><option value="CIMB">CIMB</option><option value="Public Bank">Public Bank</option><option value="RHB">RHB</option>
                  </select>
                  <input type="text" name="bank_account" placeholder="Account No." required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {type === "Customer" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Type</label>
                  <select name="customer_type" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors" onChange={handleChange} value={formData.customer_type}>
                    <option value="Company">Company</option><option value="Individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Company Name *</label>
                  <input type="text" name="name" required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">PIC Name *</label>
                  <input type="text" name="pic_name" required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Email</label>
                  <input type="email" name="email" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Phone *</label>
                  <input type="text" name="phone" required value={formData.phone} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">TIN</label>
                  <input type="text" name="tin_no" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">SSM No.</label>
                <input type="text" name="ssm_no" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
              </div>
              <div className="bg-gray-50 dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-6 transition-colors">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Address *</label>
                  <input type="text" name="address" required className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Postcode *</label>
                    <input type="text" name="postcode" required className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">City *</label>
                    <input type="text" name="city" required className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">State *</label>
                    <input type="text" name="state" required className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Country</label>
                    <input type="text" name="country" value={formData.country} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4">
            <button type="submit" disabled={loading} className="w-full bg-[#D95D69] text-white py-4 rounded-xl text-sm font-bold hover:bg-[#c44f5b] hover:shadow-[0_0_20px_rgba(217,93,105,0.4)] transition-all duration-300 active:scale-95 disabled:opacity-50">
              {loading ? "Saving..." : `Save ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}