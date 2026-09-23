import { createClient } from "@supabase/supabase-js";
import { APP_ENV, assertSupabaseUrlMatchesEnv } from "./env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    `Missing Supabase environment variables for APP_ENV="${APP_ENV}". ` +
      (APP_ENV === "local"
        ? "Run `npx supabase start` and make sure .env.local has NEXT_PUBLIC_SUPABASE_URL/ANON_KEY."
        : "Check the production environment configuration."),
  );
}

// Fail loudly, never fall back — see lib/env.ts.
assertSupabaseUrlMatchesEnv(supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
