"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== "/login") {
        setIsAuthorized(false);
        router.replace("/login");
      } 
      else if (session && pathname === "/login") {
        setIsAuthorized(false);
        router.replace("/");
      } else {
        setIsAuthorized(true);
      }
      setIsLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthorized(pathname === "/login");
        router.replace("/login");
      } else if (event === 'SIGNED_IN' && pathname === "/login") {
        setIsAuthorized(false);
        router.replace("/");
      } else {
        setIsAuthorized(Boolean(session) || pathname === "/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (isLoading || !isAuthorized) return <div className="min-h-screen bg-black"></div>;

  return <>{children}</>;
}
