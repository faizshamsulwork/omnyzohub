-- Agency document generator: one shared table for the standard paperwork an
-- influencer-marketing agency produces beyond invoices/quotations (service
-- agreements, SOWs, sub-contractor disclosures, creator briefs/agreements,
-- performance reports, NDAs). One table + a `payload` jsonb column per
-- document_type keeps this extensible without a new migration per type,
-- mirroring how invoices/quotations already lean on jsonb for line items.
--
-- New tables created by the migration role pick up default privileges to
-- anon/authenticated/service_role automatically (see the
-- `alter default privileges ... grant ... on tables` statements in
-- 20260101000000_remote_schema_baseline.sql), so this migration locks the
-- table down the same way 20260816000100_enable_rls.sql and
-- 20260824000000_lock_clients_and_unused_tables.sql did for existing tables:
-- RLS forced, one `authenticated_all` policy, anon revoked entirely.

create table "public"."documents" (
  "id"                      uuid                     not null default gen_random_uuid(),
  "document_type"           text                     not null,
  "doc_no"                  text                     not null,
  "title"                   text,
  "status"                  text                     not null default 'draft'::text,
  "counterparty_contact_id" uuid                     references public.contacts(id) on delete set null,
  "counterparty_name"       text                     not null,
  "counterparty_pic"        text,
  "counterparty_email"      text,
  "counterparty_phone"      text,
  "counterparty_address"    text,
  "issue_date"              date                     not null default current_date,
  "valid_until"             date,
  "payload"                 jsonb                    not null default '{}'::jsonb,
  "line_items"              jsonb,
  "notes"                   text,
  "terms"                   text,
  "created_at"              timestamp with time zone not null default timezone('utc'::text, now()),
  "created_by"              text,
  constraint "documents_pkey" primary key ("id"),
  constraint "documents_type_check" check ("document_type" in (
    'service_agreement',
    'sow',
    'subcontractor_disclosure',
    'creator_brief',
    'creator_agreement',
    'performance_report',
    'nda'
  ))
);

create index "documents_type_idx" on "public"."documents" ("document_type");
create index "documents_doc_no_idx" on "public"."documents" ("doc_no");

alter table "public"."documents" enable row level security;
alter table "public"."documents" force row level security;

create policy "documents_authenticated_all" on "public"."documents"
  for all
  to authenticated
  using (true)
  with check (true);

revoke all on "public"."documents" from anon;
