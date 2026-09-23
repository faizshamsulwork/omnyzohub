"use client";

import { APP_ENV, isRemoteSupabaseUrl } from "../lib/env";

// Visual proof-of-isolation pill for local development.
//
// Purpose: after the localhost <-> live Supabase split, it's easy to forget
// which database `npm run dev` is actually pointed at (a stray `.env.local`
// edit, a bad merge, etc. can silently re-point dev at production). This
// badge reads the same NEXT_PUBLIC_SUPABASE_URL the app itself connects
// with and reports it plainly, so a glance at the corner is enough to catch
// dev-hitting-live before it burns egress or touches real client data.
//
// It never renders in a production build (Vercel), only during `next dev`.
// (In practice lib/supabase.ts would already have thrown before this could
// render mismatched — this is a secondary, visual confirmation.)

export default function EnvBadge() {
  if (process.env.NODE_ENV === "production") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const isLiveDb = APP_ENV === "local" && isRemoteSupabaseUrl(supabaseUrl);

  let host = "not set";
  try {
    if (supabaseUrl) host = new URL(supabaseUrl).host;
  } catch {
    host = supabaseUrl;
  }

  return (
    <div
      title={`NEXT_PUBLIC_SUPABASE_URL: ${host}`}
      className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-lg backdrop-blur-md print:hidden select-none ${
        isLiveDb
          ? "border-red-500/50 bg-red-950/85 text-red-300"
          : "border-emerald-500/50 bg-emerald-950/85 text-emerald-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isLiveDb ? "bg-red-400 animate-pulse" : "bg-emerald-400"
        }`}
      />
      {isLiveDb ? "DEV → LIVE DB ⚠️" : "DEV → LOCAL DB"}
    </div>
  );
}
