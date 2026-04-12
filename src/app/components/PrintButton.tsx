"use client";

import { useState } from "react";
import { toast } from "sonner";

interface PrintProps {
  documentName?: string;
  targetId?: string;
  filename?: string;
}

export default function PrintButton({ 
  documentName = "Document", 
  targetId = "invoice-document", 
  filename = "Document.pdf" 
}: PrintProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsOpen(false); 
    setIsGenerating(true);
    const toastId = toast.loading("Running Smart Slicer Engine...");
    
    try {
      const element = document.getElementById(targetId);

      if (!element) {
        toast.error("Error: Document element not found.", { id: toastId });
        setIsGenerating(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        // 🔴 THE FIX: Tukar 'filter' kepada 'ignoreElements' supaya TypeScript dan Vercel gembira
        ignoreElements: (node) => node.tagName === 'SCRIPT' || node.tagName === 'STYLE'
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeightMM = pdf.internal.pageSize.getHeight();
      
      const marginY = 15; // 15mm Safe Margin Atas & Bawah
      const printHeightMM = pageHeightMM - (marginY * 2);

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidthInMM = pdfWidth;
      const imgHeightInMM = (imgProps.height * imgWidthInMM) / imgProps.width;

      const cssPxToMM = (2 * imgHeightInMM) / canvas.height;
      const containerRect = element.getBoundingClientRect();
      
      const avoidElements = document.querySelectorAll('.avoid-break');
      const breaks = Array.from(avoidElements).map(el => {
         const rect = el.getBoundingClientRect();
         return {
             topMM: (rect.top - containerRect.top) * cssPxToMM,
             bottomMM: (rect.bottom - containerRect.top) * cssPxToMM
         };
      });

      // FUNGSI FOOTER KORPORAT
      const drawFooter = (doc: any, w: number, h: number) => {
        doc.setFontSize(7.5); 
        doc.setTextColor(128, 128, 128); 
        const footerText = "Company Registration No: 202503336982 (MA0340342-V). Registered Office: 2003, The Sky Residensi, Jalan 6/91 Taman Shamelin Perkasa, 56100 Kuala Lumpur, Malaysia. Email: hello@omnyzo.com";
        
        const lines = doc.splitTextToSize(footerText, w - 30);
        const lineHeight = 3.5;
        const startY = h - 10 - ((lines.length - 1) * lineHeight);

        doc.text(lines, w / 2, startY, { align: "center" });
      };

      let currentYMM = 0;

      while (currentYMM < imgHeightInMM) {
        let pageBottomMM = currentYMM + printHeightMM;

        for (const b of breaks) {
            if (b.topMM < pageBottomMM && b.bottomMM > pageBottomMM) {
                pageBottomMM = b.topMM - 2; 
                break;
            }
        }

        if (pageBottomMM <= currentYMM) {
            pageBottomMM = currentYMM + printHeightMM;
        }

        const sliceHeightMM = pageBottomMM - currentYMM;

        if (currentYMM > 0) pdf.addPage();

        pdf.addImage(dataUrl, 'JPEG', 0, marginY - currentYMM, imgWidthInMM, imgHeightInMM);

        // Penutup putih margin
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, marginY, 'F'); 
        pdf.rect(0, pageHeightMM - marginY, pdfWidth, marginY, 'F'); 

        const whiteOutStart = marginY + sliceHeightMM;
        const whiteOutHeight = pageHeightMM - whiteOutStart;
        if (whiteOutHeight > 0) {
          pdf.rect(0, whiteOutStart, pdfWidth, whiteOutHeight, 'F');
        }

        // COP FOOTER YANG KEMAS DI SINI
        drawFooter(pdf, pdfWidth, pageHeightMM);

        currentYMM = pageBottomMM;

        if (imgHeightInMM - currentYMM < 5) break; 
      }

      pdf.save(filename);
      toast.success("PDF Downloaded successfully!", { id: toastId });

    } catch (error: any) {
      console.error("PDF Engine Error:", error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        disabled={isGenerating}
        className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 active:scale-95 print:hidden disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        {isGenerating ? "Exporting..." : "Export PDF"}
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
                Generate Smart PDF
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