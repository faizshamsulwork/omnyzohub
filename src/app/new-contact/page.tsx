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
    name: "", email: "", phone: "+60", service_role: "", ic_no: "", bank_name: "", bank_account: "",
    customer_type: "Company", freelancer_type: "Individual", pic_name: "", tin_no: "", ssm_no: "", address: "", postcode: "", city: "", state: "", country: "Malaysia"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from("contacts").insert([{
      contact_type: type, 
      name: formData.name, 
      email: formData.email, 
      phone: formData.phone,
      service_role: type === "Freelancer" ? formData.service_role : null,
      ic_no: type === "Freelancer" && formData.freelancer_type === "Individual" ? formData.ic_no : null,
      bank_name: type === "Freelancer" ? formData.bank_name : null,
      bank_account: type === "Freelancer" ? formData.bank_account : null,
      customer_type: type === "Customer" ? formData.customer_type : formData.freelancer_type,
      pic_name: type === "Customer" ? formData.pic_name : null,
      tin_no: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.tin_no : null,
      ssm_no: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.ssm_no : null,
      address: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.address : null,
      postcode: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.postcode : null,
      city: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.city : null,
      state: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.state : null,
      country: type === "Customer" || (type === "Freelancer" && formData.freelancer_type === "Company") ? formData.country : null,
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
          
          {/* ======================= FORM FREELANCER ======================= */}
          {type === "Freelancer" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Entity Type</label>
                  <div className="relative">
                    <select name="freelancer_type" className="w-full p-3.5 pr-10 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors cursor-pointer" onChange={handleChange} value={formData.freelancer_type}>
                      <option value="Individual">Individual</option>
                      <option value="Company">Company / Enterprise</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Name / Company *</label>
                  <input type="text" name="name" required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Service / Role</label>
                  <input type="text" name="service_role" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                
                {formData.freelancer_type === "Individual" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">IC / Passport No.</label>
                    <input type="text" name="ic_no" placeholder="e.g. 970129-14-XXXX" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">SSM No.</label>
                    <input type="text" name="ssm_no" placeholder="e.g. 20240123456" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                )}
              </div>

              {formData.freelancer_type === "Company" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">TIN No.</label>
                      <input type="text" name="tin_no" placeholder="Tax Identification Number" className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-6 transition-colors">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Address *</label>
                      <input type="text" name="address" required={formData.freelancer_type === "Company"} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Postcode *</label>
                        <input type="text" name="postcode" required={formData.freelancer_type === "Company"} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">City *</label>
                        <input type="text" name="city" required={formData.freelancer_type === "Company"} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">State *</label>
                        <input type="text" name="state" required={formData.freelancer_type === "Company"} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Country</label>
                        <input type="text" name="country" value={formData.country} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Bank Info *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <select name="bank_name" required className="w-full p-3.5 pr-10 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors cursor-pointer" onChange={handleChange}>
                      <option value="">Select Bank...</option>
                      <optgroup label="Malaysia">
                        <option value="Maybank">Maybank</option><option value="CIMB">CIMB</option><option value="Public Bank">Public Bank</option><option value="RHB">RHB</option><option value="Hong Leong Bank">Hong Leong Bank</option>
                      </optgroup>
                      <optgroup label="Indonesia">
                        <option value="BCA">BCA (Bank Central Asia)</option><option value="Bank Mandiri">Bank Mandiri</option><option value="BNI">BNI (Bank Negara Indonesia)</option><option value="BRI">BRI (Bank Rakyat Indonesia)</option><option value="CIMB Niaga">CIMB Niaga</option>
                      </optgroup>
                      <optgroup label="E-Wallets">
                        <option value="GoPay">GoPay</option><option value="OVO">OVO</option><option value="DANA">DANA</option>
                      </optgroup>
                      <option value="Others">Others / Wise</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  <input type="text" name="bank_account" placeholder="Account No." required className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {/* ======================= FORM CUSTOMER ======================= */}
          {type === "Customer" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Type</label>
                  <div className="relative">
                    <select name="customer_type" className="w-full p-3.5 pr-10 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors cursor-pointer" onChange={handleChange} value={formData.customer_type}>
                      <option value="Company">Company</option><option value="Individual">Individual</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
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