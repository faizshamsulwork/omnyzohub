-- Company Assets / Capital Allowance module: add the fields the tax engine
-- (src/app/lib/tax/) needs, on top of the existing minimal `assets` table.
--
-- All columns are nullable (or default to a safe, non-claiming value) so
-- every existing row keeps rendering exactly as before. A row with no tax
-- fields filled in reads as "needs review" everywhere it matters — nothing
-- is silently treated as confirmed/eligible just because a column is new.
--
-- Existing columns (item_name, category, purchase_date, amount, receipt_url,
-- notes) are untouched: no renames, no data rewritten, no rows deleted.
-- LOCAL ONLY — do not run this against production. See the session report
-- for the equivalent production migration step.

alter table "public"."assets"
  add column if not exists "supplier_name" text,
  add column if not exists "placed_in_use_date" date,
  add column if not exists "business_use_percentage" numeric,
  add column if not exists "source_type" text,
  add column if not exists "tax_rule_code" text,
  add column if not exists "tax_rule_confirmed" boolean not null default false,
  add column if not exists "tax_basis_status" text;

comment on column "public"."assets"."supplier_name" is
  'Free-text supplier/vendor name, e.g. "Machines Sdn Bhd". Optional.';

comment on column "public"."assets"."placed_in_use_date" is
  'Date the asset actually started being used for the business. Distinct '
  'from purchase_date. NULL means unconfirmed -- must never be silently '
  'assumed equal to purchase_date; see lib/tax/capitalAllowance.ts.';

comment on column "public"."assets"."business_use_percentage" is
  'Business-use share, 0-100. NULL is treated as 100 for display/calculation '
  'purposes but does not by itself confirm tax eligibility.';

comment on column "public"."assets"."source_type" is
  'How the business came to hold the asset: purchased_by_business, '
  'owner_contribution, personal_to_business_transfer, or other.';

comment on column "public"."assets"."tax_rule_code" is
  'Capital allowance rule code applied to this asset (see lib/tax/rules.ts '
  'for the registry, e.g. PLANT_MACHINERY_STANDARD, ICT_ACA_2024, '
  'SMALL_VALUE_ASSET). Only trusted for calculation when tax_rule_confirmed '
  'is true.';

comment on column "public"."assets"."tax_rule_confirmed" is
  'True only once a human has explicitly confirmed tax_rule_code is correct '
  'for this asset. Defaults false -- a filled-in tax_rule_code is a '
  'suggestion, not a confirmation, until this flips.';

comment on column "public"."assets"."tax_basis_status" is
  'NULL or ''confirmed'': the recorded asset value is accepted as the '
  'qualifying tax basis. ''needs_review'': the recorded value (e.g. an '
  'asset transferred from personal to business use) has not been confirmed '
  'as the correct tax basis, so it is excluded from confirmed allowance '
  'totals until reviewed.';

alter table "public"."assets"
  add constraint "assets_business_use_percentage_range"
  check (
    business_use_percentage is null
    or (business_use_percentage >= 0 and business_use_percentage <= 100)
  );

alter table "public"."assets"
  add constraint "assets_source_type_known"
  check (
    source_type is null
    or source_type in (
      'purchased_by_business',
      'owner_contribution',
      'personal_to_business_transfer',
      'other'
    )
  );

alter table "public"."assets"
  add constraint "assets_tax_basis_status_known"
  check (
    tax_basis_status is null
    or tax_basis_status in ('needs_review', 'confirmed')
  );

-- tax_rule_code intentionally has NO check constraint: the rule registry in
-- lib/tax/rules.ts is the source of truth and is expected to grow (e.g. a
-- future ICT_ACA_2026_OPTIONAL variant) without needing a migration each
-- time. The app validates the code against the registry, not Postgres.
