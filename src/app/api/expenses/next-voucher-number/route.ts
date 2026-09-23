import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { assertSupabaseUrlMatchesEnv } from "../../../lib/env";

// Payment-voucher numbering needs to read existing `expenses` rows to find
// the next free PV number. RLS locks `expenses` SELECT to superadmin only
// (see 20260923_lock_expenses_select_to_superadmin.sql), but any
// authenticated user is allowed to create a voucher for a Freelancer
// contact. This route runs the lookup with the service-role key so a
// non-superadmin caller can still get a correct next number, after first
// verifying the caller has a valid session with their own (anon-key) token.

const PREFIX_PATTERN = /^\d{8}-PV$/;

const getAnonSupabase = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }
  assertSupabaseUrlMatchesEnv(supabaseUrl);
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
};

const getServiceRoleSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  assertSupabaseUrlMatchesEnv(supabaseUrl);
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization");
  return authorization?.replace(/^Bearer\s+/i, "") || "";
};

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "No active session found." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix") || "";
  if (!PREFIX_PATTERN.test(prefix)) {
    return NextResponse.json({ error: "Invalid prefix format." }, { status: 400 });
  }

  try {
    const anonSupabase = getAnonSupabase(accessToken);
    const { data: { user }, error: userError } = await anonSupabase.auth.getUser(accessToken);
    if (userError || !user?.email) {
      return NextResponse.json({ error: "Unable to verify your session." }, { status: 401 });
    }

    const serviceSupabase = getServiceRoleSupabase();
    const { data: existing, error: queryError } = await serviceSupabase
      .from("expenses")
      .select("description")
      .like("description", `[${prefix}%`)
      .order("created_at", { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    let nextNum = 1;
    if (existing && existing.length > 0) {
      const maxPV = existing.reduce((max, curr) => {
        const match = typeof curr.description === "string" ? curr.description.match(/-PV(\d+)]/) : null;
        if (!match) return max;
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }, 0);
      nextNum = maxPV + 1;
    }

    return NextResponse.json({ nextNum }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to compute next voucher number.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
