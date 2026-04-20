import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "./components/AuthProvider";
import Sidebar from "./components/Sidebar";
import QuickAddMenu from "./components/QuickAddMenu";
import MobileNav from "./components/MobileNav";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-jakarta'
});

export const metadata: Metadata = {
  title: "Omnyzo Hub",
  description: "Agency Operating System",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Omnyzo Hub",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @keyframes aurora1 {
            0% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
            33% { transform: translate(5vw, -5vh) rotate(5deg) scale(1.1); }
            66% { transform: translate(-5vw, 5vh) rotate(-5deg) scale(0.9); }
            100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
          }
          @keyframes aurora2 {
            0% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
            33% { transform: translate(-5vw, 5vh) rotate(-5deg) scale(1.2); }
            66% { transform: translate(5vw, -5vh) rotate(5deg) scale(0.8); }
            100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
          }
          @keyframes aurora3 {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(0vw, 10vh) scale(1.3); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-aurora-1 { animation: aurora1 25s infinite ease-in-out; }
          .animate-aurora-2 { animation: aurora2 30s infinite ease-in-out reverse; }
          .animate-aurora-3 { animation: aurora3 20s infinite ease-in-out; }
        `}</style>
      </head>
      {/* Buang bg-gray-50 di body supaya tak kacau background fixed kat bawah */}
      <body className={`${jakarta.variable} font-sans flex min-h-screen bg-transparent text-gray-900 dark:text-gray-100 overflow-hidden print:overflow-visible antialiased transition-colors duration-500`}>
        <AuthProvider>
          <Toaster position="top-center" expand={false} richColors closeButton theme="dark" />
          
          {/* ================= BACKGROUND UTAMA ================= */}
          {/* Gunakan bg-[#f1f5f9] (Slate) supaya nampak premium/silver untuk Light Mode */}
          <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-[#f1f5f9] dark:bg-[#050505] transition-colors duration-500 print:hidden">
            
            {/* Efek Lampu Studio dari Atas (Z-0) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_transparent_80%)] dark:bg-[radial-gradient(ellipse_at_top,_#1a1a1a_0%,_transparent_80%)] transition-colors duration-500 z-0"></div>
            
            {/* LAPISAN AURORA (Dinaikkan ke Z-10 supaya tak tertutup) */}
            <div className="absolute top-0 left-0 w-full h-full opacity-100 dark:opacity-40 blur-[120px] dark:mix-blend-screen pointer-events-none transition-opacity duration-500 z-10">
              
              {/* Gelombang 1: Biru Pastel (Light) / Emerald (Dark) */}
              <div className="absolute w-[60vw] h-[40vh] bg-blue-400/40 dark:bg-emerald-500/60 rounded-full top-[-10%] left-[-10%] transition-colors duration-1000 animate-aurora-1 transform-gpu"></div>
              
              {/* Gelombang 2: Indigo Pastel (Light) / Teal (Dark) */}
              <div className="absolute w-[50vw] h-[50vh] bg-indigo-400/30 dark:bg-teal-500/50 rounded-full top-[20%] right-[-10%] transition-colors duration-1000 animate-aurora-2 transform-gpu"></div>
              
              {/* Gelombang 3: Sky Blue (Light) / Green (Dark) */}
              <div className="absolute w-[60vw] h-[30vh] bg-sky-300/40 dark:bg-green-400/40 rounded-full bottom-[-10%] left-[20%] transition-colors duration-1000 animate-aurora-3 transform-gpu"></div>
              
            </div>
          </div>

          <Sidebar />

          <main className="flex-1 h-screen print:h-auto overflow-y-auto print:overflow-visible relative pb-24 md:pb-0">
            {children}
          </main>

          <QuickAddMenu />
          <MobileNav />

        </AuthProvider>
      </body>
    </html>
  );
}