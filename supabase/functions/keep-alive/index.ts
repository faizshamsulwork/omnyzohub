// keep-alive
//
// Purpose: touch the production database with the smallest possible query
// so Supabase registers "activity" on the project and does not auto-pause
// it after 7 days of no traffic. This function does nothing else — it is
// not part of the app, and the app never calls it.
//
// Egress footprint: one `SELECT 1` round trip (no rows, no table data) and
// a ~15-byte JSON response. Intended to be hit every few days by an
// external cron (e.g. cron-job.org), never by the app itself.
//
// SUPABASE_DB_URL is a reserved secret that Supabase injects automatically
// into every deployed Edge Function — nothing to configure for it.

import postgres from "npm:postgres@3.4.5";

Deno.serve(async () => {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");

  if (!dbUrl) {
    return new Response(
      JSON.stringify({ status: "error", message: "SUPABASE_DB_URL not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const sql = postgres(dbUrl, { max: 1 });

  try {
    await sql`select 1`;
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
});
