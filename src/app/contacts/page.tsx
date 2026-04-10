import Link from "next/link";
import { supabase } from "../lib/supabase";
import ContactAction from "../components/ContactAction";

export const revalidate = 0; 

export default async function ContactsDirectory() {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) console.error("Error fetching contacts:", error);

  const customers = contacts?.filter(c => c.contact_type === 'Customer') || [];
  const freelancers = contacts?.filter(c => c.contact_type === 'Freelancer') || [];

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 selection:text-black relative transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight transition-colors">Contacts Directory</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg transition-colors">Manage your Freelancers and Customers separately.</p>
          </div>
          <div>
            <Link 
              href="/new-contact" 
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 active:scale-95 inline-block"
            >
              + New Contact
            </Link>
          </div>
        </header>

        {/* ===================== JADUAL CUSTOMERS ===================== */}
        <div className="mb-4 px-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide transition-colors">Customers</h2>
        </div>
        <div className="mb-12 bg-white dark:bg-[#111111] p-8 rounded-[32px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors duration-500">
          {customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 transition-colors">
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Company Name</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">PIC Name</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Phone</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Email</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right transition-colors">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((contact) => (
                    <tr key={contact.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-300">
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          {contact.name}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 transition-colors">{contact.pic_name || "-"}</td>
                      <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 transition-colors">{contact.phone}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 transition-colors">{contact.email || "-"}</td>
                      <td className="py-4 px-4 text-right">
                        <ContactAction id={contact.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-gray-500 transition-colors">No customers found.</p>
            </div>
          )}
        </div>

        {/* ===================== JADUAL FREELANCERS ===================== */}
        <div className="mb-4 px-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide transition-colors">Freelancers</h2>
        </div>
        <div className="bg-white dark:bg-[#111111] p-8 rounded-[32px] shadow-xl dark:shadow-2xl dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-800 transition-colors duration-500">
          {freelancers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 transition-colors">
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Name</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Service / Role</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Phone</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Email</th>
                    <th className="pb-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right transition-colors">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {freelancers.map((contact) => (
                    <tr key={contact.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-300">
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 transition-colors">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          {contact.name}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 transition-colors">
                          {(contact.service_role || "FREELANCER").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 transition-colors">{contact.phone}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 transition-colors">{contact.email || "-"}</td>
                      <td className="py-4 px-4 text-right">
                        <ContactAction id={contact.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-gray-500 transition-colors">No freelancers found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}