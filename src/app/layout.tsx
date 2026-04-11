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
      <body className={`${jakarta.variable} font-sans flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden print:overflow-visible antialiased transition-colors duration-500`}>
        <AuthProvider>
          <Toaster position="top-center" expand={false} richColors closeButton theme="dark" />
          
          {/* Background Aurora */}
          <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-white dark:bg-black transition-colors duration-500 print:hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#f8fafc_40%,_#e2e8f0_100%)] dark:bg-[radial-gradient(ellipse_at_center,_#000000_0%,_#0a0a0a_40%,_#111111_100%)] opacity-80 dark:opacity-100 transition-colors duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-60 dark:opacity-15 blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none transition-opacity duration-500">
              <div className="absolute w-[800px] h-[800px] rounded-full bg-blue-300/60 dark:bg-blue-900/40 -top-40 -left-40 transition-colors duration-500"></div>
              <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-200/60 dark:bg-zinc-800/40 top-20 right-0 transition-colors duration-500"></div>
            </div>
          </div>

          <Sidebar />

          {/* PB-24 penting supaya isi website tak tersorok belakang Mobile Nav bar kat phone */}
          <main className="flex-1 h-screen print:h-auto overflow-y-auto print:overflow-visible relative pb-24 md:pb-0">
            {children}
          </main>

          <QuickAddMenu />

        </AuthProvider>
      </body>
    </html>
  );
}