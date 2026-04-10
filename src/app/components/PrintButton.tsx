"use client";

import { useState } from "react";

export default function PrintButton({ documentName = "Document" }: { documentName?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = () => {
    setIsOpen(false);
    // Beri masa animasi modal tutup sekejap, baru panggil Print
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 active:scale-95 print:hidden"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export PDF
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 sm:p-0 print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
          
          <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl dark:shadow-black/50 animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
            <div className="text-center mb-8 mt-2">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">Export Document</h3>
              <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest">{documentName}</p>
            </div>

            <div className="space-y-3">
              <button onClick={handleDownload} className="w-full py-4 px-4 bg-blue-600 text-white rounded-2xl text-base font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Generate Document
              </button>
              <button onClick={() => setIsOpen(false)} className="w-full py-4 px-4 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-2xl text-base font-bold hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}