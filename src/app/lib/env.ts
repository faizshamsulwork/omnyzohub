// Centralized environment identification + safety guard.
//
// Single source of truth for "which Supabase project is this running
// against, and is that actually allowed". Every place that builds a
// Supabase client (browser client, server route handlers) should call
// `assertSupabaseUrlMatchesEnv` right after reading the URL from env vars,
// instead of re-implementing this check locally.
//
// Why this exists: an earlier incident had local development silently
// consuming production Supabase egress because nothing stopped a
// misconfigured .env.local from pointing at the live project. The rule
// going forward is: if the environment is wrong, THROW — never fall back,
// never just console.warn.

export type AppEnv = "local" | "production";

function resolveAppEnv(): AppEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (raw === "local" || raw === "production") return raw;

  // No explicit flag set. Fall back to NODE_ENV as a conservative signal
  // (Vercel/`next build` sets NODE_ENV=production; `next dev` does not).
  // This is only a fallback — always prefer setting NEXT_PUBLIC_APP_ENV
  // explicitly in .env.local / .env.production.local.
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

export const APP_ENV: AppEnv = resolveAppEnv();
export const IS_LOCAL_ENV = APP_ENV === "local";
export const IS_PRODUCTION_ENV = APP_ENV === "production";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * True if `url` points somewhere other than a local Supabase instance.
 * Malformed URLs are treated as remote/unsafe (fail closed, not open).
 */
export function isRemoteSupabaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return !LOCAL_HOSTNAMES.has(hostname);
  } catch {
    return true;
  }
}

/**
 * Throws if the given Supabase URL doesn't belong in the current APP_ENV.
 * Call this immediately after resolving NEXT_PUBLIC_SUPABASE_URL, before
 * constructing any Supabase client.
 */
export function assertSupabaseUrlMatchesEnv(supabaseUrl: string): void {
  const remote = isRemoteSupabaseUrl(supabaseUrl);

  if (APP_ENV === "local" && remote) {
    throw new Error(
      `SAFETY BLOCK: LOCAL Omnyzo Hub attempted to connect to a remote Supabase project (${supabaseUrl}). ` +
        "This must never happen — local dev egress must never hit production. " +
        "Fix .env.local: NEXT_PUBLIC_SUPABASE_URL should point to 127.0.0.1 (run `npx supabase start`), " +
        "not a *.supabase.co project.",
    );
  }

  if (APP_ENV === "production" && !remote) {
    throw new Error(
      `SAFETY BLOCK: PRODUCTION Omnyzo Hub attempted to connect to a local Supabase URL (${supabaseUrl}). ` +
        "A deployed build must never point at localhost/127.0.0.1.",
    );
  }
}
