import Link from "next/link";
import { DOCUMENT_TYPES } from "../../lib/documents/types";

export default function NewDocumentPage() {
  return (
    <div className="min-h-screen p-6 md:p-12 relative transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-4xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/documents" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Documents
        </Link>

        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-2">New Document</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 text-sm md:text-base font-medium">Pick the document type to create.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DOCUMENT_TYPES.map((meta) => (
            meta.built ? (
              <Link
                key={meta.type}
                href={`/documents/new/${meta.type}`}
                className="group rounded-[28px] border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-6 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all active:scale-95"
              >
                <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{meta.label}</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{meta.description}</p>
              </Link>
            ) : (
              <div
                key={meta.type}
                className="rounded-[28px] border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-black/20 p-6 opacity-60 cursor-not-allowed"
                title="Coming soon"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400">{meta.label}</h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded-full">Coming soon</span>
                </div>
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">{meta.description}</p>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
