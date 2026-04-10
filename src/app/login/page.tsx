"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Authenticating...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message, { id: toastId });
      setLoading(false);
    } else {
      toast.success("Welcome to Omnyzo Hub", { id: toastId });
      // HARD REDIRECT UNTUK ELAK SANGKUT DAN LOAD DASHBOARD DENGAN CEPAT
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white dark:bg-black transition-colors duration-500">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/30 dark:bg-blue-900/40 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-300/30 dark:bg-cyan-900/30 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md bg-white/60 dark:bg-[#111111]/70 backdrop-blur-3xl p-10 rounded-[40px] shadow-2xl border border-white/50 dark:border-gray-800/50 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white mb-2">Omnyzo.</h1>
          <p className="text-sm font-medium text-gray-500 tracking-widest uppercase">Agency Operating System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Work Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all backdrop-blur-md" 
              placeholder="name@omnyzo.com" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all backdrop-blur-md" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-blue-600 text-white p-4 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex justify-center"
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-400 font-medium">Authorized Personnel Only. Monitored System.</p>
        </div>
      </div>
    </div>
  );
}