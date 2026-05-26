"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function EditContact({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const contactId = resolvedParams.id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [type, setType] = useState<"Customer" | "Freelancer">("Customer"); 

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", service_role: "", bank_name: "", bank_account: "",
    customer_type: "Company", pic_name: "", tin_no: "", ssm_no: "", address: "", postcode: "", city: "", state: "", country: "Malaysia"
  });

  // LOGIK AUTO-FILL: Tarik data lama dari database bila page dibuka
  useEffect(() => {
    const fetchContact = async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();

      if (data) {
        setType(data.contact_type);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          service_role: data.service_role || "",
          bank_name: data.bank_name || "",
          bank_account: data.bank_account || "",
          customer_type: data.customer_type || "Company",
          pic_name: data.pic_name || "",
          tin_no: data.tin_no || "",
          ssm_no: data.ssm_no || "",
          address: data.address || "",
          postcode: data.postcode || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "Malaysia"
        });
      } else if (error) {
        toast.error("Contact not found!");
      }
      setFetching(false);
    };

    if (contactId) fetchContact();
  }, [contactId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // UPDATE LOGIC (Bukan Insert)
    const { error } = await supabase.from("contacts").update({
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
    }).eq("id", contactId);

    if (!error) {
      toast.success("Contact updated successfully!");
      router.push("/contacts"); 
      router.refresh();
    } else {
      toast.error(`Failed to update: ${error.message}`);
      setLoading(false);
    }
  };

  if (fetching) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400 animate-pulse">Loading contact data...</div>;

  return (
    <div className="min-h-screen p-8 md:p-12 flex items-center justify-center relative z-10">
      <div className="w-full max-w-3xl bg-white dark:bg-[#151517] p-8 md:p-10 rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-500 animate-in zoom-in-95">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-wide transition-colors">Edit {type}</h1>
          <Link href="/contacts" className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-bold">×</span>
          </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {type === "Freelancer" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Name / Company *</label>
                <input type="text" name="name" required value={formData.name} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Phone *</label>
                  <input type="text" name="phone" required value={formData.phone} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Service / Role</label>
                <input type="text" name="service_role" value={formData.service_role} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Bank Info *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select name="bank_name" required value={formData.bank_name} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors" onChange={handleChange}>
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
                  <input type="text" name="bank_account" placeholder="Account No." required value={formData.bank_account} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {type === "Customer" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Type</label>
                  <select name="customer_type" value={formData.customer_type} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none appearance-none transition-colors" onChange={handleChange}>
                    <option value="Company">Company</option><option value="Individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Company Name *</label>
                  <input type="text" name="name" required value={formData.name} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">PIC Name *</label>
                  <input type="text" name="pic_name" required value={formData.pic_name} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Phone *</label>
                  <input type="text" name="phone" required value={formData.phone} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">TIN</label>
                  <input type="text" name="tin_no" value={formData.tin_no} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">SSM No.</label>
                <input type="text" name="ssm_no" value={formData.ssm_no} className="w-full p-3.5 bg-gray-50 dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
              </div>
              <div className="bg-gray-50 dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-6 transition-colors">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Address *</label>
                  <input type="text" name="address" required value={formData.address} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Postcode *</label>
                    <input type="text" name="postcode" required value={formData.postcode} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">City *</label>
                    <input type="text" name="city" required value={formData.city} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">State *</label>
                    <input type="text" name="state" required value={formData.state} className="w-full p-3.5 bg-white dark:bg-[#1B1B1E] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:ring-1 outline-none transition-colors" onChange={handleChange} />
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
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all duration-300 active:scale-95 disabled:opacity-50">
              {loading ? "Saving Updates..." : "Save Updates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}