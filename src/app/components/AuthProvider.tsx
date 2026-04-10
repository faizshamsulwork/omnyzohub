"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Kalau takde session (belum login), dan bukan kat muka surat login
      if (!session && pathname !== "/login") {
        router.push("/login");
      } 
      // Kalau dah login, tapi cuba pergi muka surat login, tendang ke Dashboard
      else if (session && pathname === "/login") {
        router.push("/");
      }
      setIsLoading(false);
    };

    checkUser();

    // Dengar kalau ada perubahan (contoh: user tekan Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push("/login");
      } else if (event === 'SIGNED_IN' && pathname === "/login") {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  // Tunjuk skrin kosong putih sementara sistem check kunci
  if (isLoading) return <div className="min-h-screen bg-black"></div>;

  return <>{children}</>;
}