-- Close a real access gap: `expenses` and `assets` RLS previously granted
-- full read/write to ANY authenticated user ("expenses_authenticated_all",
-- "assets_authenticated_all"), while the app's own UI only *hides* those
-- pages from non-superadmin users (isSuperadminEmail() in
-- src/app/lib/utils.ts). That's a client-side-only restriction -- any
-- authenticated user could already read/write both tables directly via the
-- Supabase REST API, bypassing the UI entirely.
--
-- `assets` has exactly one consumer (src/app/assets/page.tsx), which
-- already redirects non-superadmin users away before querying -- so it can
-- be locked to superadmin for every operation with zero functional impact.
--
-- `expenses` is more nuanced: any authenticated user can create a Payment
-- Voucher for a Freelancer-type contact (src/app/components/InvoiceForm.tsx,
-- not gated by isSuperadminEmail), which inserts a row into `expenses`
-- directly. That flow needs to keep working. So `expenses` gets a split
-- policy: INSERT stays open to any authenticated user, SELECT/UPDATE/DELETE
-- become superadmin-only -- matching what the UI already does (expenses
-- list/dashboard pages already redirect non-superadmin away).
--
-- The two superadmin emails match SUPERADMIN_EMAILS in
-- src/app/lib/utils.ts. If that set ever changes, this migration must be
-- updated too -- there is no shared source of truth between the two yet.

drop policy "assets_authenticated_all" on "public"."assets";

create policy "assets_superadmin_all" on "public"."assets"
  for all
  to authenticated
  using (auth.email() in ('faiz@omnyzo.com', 'faiz.shamsul@omnyzo.com'))
  with check (auth.email() in ('faiz@omnyzo.com', 'faiz.shamsul@omnyzo.com'));

drop policy "expenses_authenticated_all" on "public"."expenses";

create policy "expenses_authenticated_insert" on "public"."expenses"
  for insert
  to authenticated
  with check (true);

create policy "expenses_superadmin_select" on "public"."expenses"
  for select
  to authenticated
  using (auth.email() in ('faiz@omnyzo.com', 'faiz.shamsul@omnyzo.com'));

create policy "expenses_superadmin_update" on "public"."expenses"
  for update
  to authenticated
  using (auth.email() in ('faiz@omnyzo.com', 'faiz.shamsul@omnyzo.com'))
  with check (auth.email() in ('faiz@omnyzo.com', 'faiz.shamsul@omnyzo.com'));

create policy "expenses_superadmin_delete" on "public"."expenses"
  for delete
  to authenticated
  using (auth.email() in ('faiz@omnyzo.com', 'faiz.shamsul@omnyzo.com'));
