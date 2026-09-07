-- Follow-up to 20260816000100_enable_rls.sql: that migration missed two things
-- surfaced by a local security scan against a schema pulled from production:
--
--   1. public.clients was still wide open to anon (SELECT/INSERT/UPDATE/DELETE)
--      even though the app (ClientAction.tsx) reads/writes it through the same
--      logged-in Supabase session as every other business table.
--
--   2. public.team_review_assignments / team_review_cycles / team_review_responses
--      exist in the live schema but are not referenced anywhere in the app
--      (grep across src/app turned up nothing) and hold no rows. Locking them
--      down fully (RLS enabled, zero policies) rather than granting
--      `authenticated` access, since nothing depends on them yet -- add a
--      real policy in a later migration if/when a feature starts using them.

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'clients'
  ]
  loop
    if to_regclass('public.' || target_table) is null then
      raise notice 'Skipping %, table not found', target_table;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);

    execute format('drop policy if exists %I on public.%I',
                   target_table || '_authenticated_all', target_table);

    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using (true)
        with check (true)
    $f$, target_table || '_authenticated_all', target_table);

    execute format('revoke all on public.%I from anon', target_table);
  end loop;

  foreach target_table in array array[
    'team_review_assignments',
    'team_review_cycles',
    'team_review_responses'
  ]
  loop
    if to_regclass('public.' || target_table) is null then
      raise notice 'Skipping %, table not found', target_table;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);
    execute format('revoke all on public.%I from anon, authenticated', target_table);
  end loop;
end
$$;
