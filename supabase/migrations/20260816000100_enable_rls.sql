-- Lock every application table behind authentication.
--
-- Before this migration the anon role could SELECT, INSERT, UPDATE and DELETE
-- on every table. The anon key ships inside the browser bundle, so anybody who
-- loaded the site could read or destroy the whole ledger, and the delete
-- passcode on /api/invoices/[id] could be bypassed by calling PostgREST
-- directly.
--
-- Every page reads through a logged-in Supabase session, so `authenticated` is
-- the only role that needs access.

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'invoices',
    'quotations',
    'contacts',
    'expenses',
    'assets',
    'audit_logs'
  ]
  loop
    if to_regclass('public.' || target_table) is null then
      raise notice 'Skipping %, table not found', target_table;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);

    -- Drop the policy first so this migration can be re-run safely.
    execute format('drop policy if exists %I on public.%I',
                   target_table || '_authenticated_all', target_table);

    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using (true)
        with check (true)
    $f$, target_table || '_authenticated_all', target_table);

    -- Revoke the blanket grants PostgREST exposes to unauthenticated callers.
    execute format('revoke all on public.%I from anon', target_table);
  end loop;
end
$$;
