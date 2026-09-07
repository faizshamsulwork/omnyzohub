alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create table "public"."assets" (
  "id"            uuid                     not null default gen_random_uuid(),
  "created_at"    timestamp with time zone not null default timezone('utc'::text, now()),
  "item_name"     text                     not null,
  "category"      text                     not null,
  "purchase_date" date                     not null,
  "amount"        numeric                  not null,
  "receipt_url"   text,
  "notes"         text,
  constraint "assets_pkey" primary key (id)
);

alter table "public"."assets"
  enable row level security;

alter table "public"."assets"
  force row level security;

create table "public"."audit_logs" (
  "id"           uuid                     not null default gen_random_uuid(),
  "created_at"   timestamp with time zone not null default timezone('utc'::text, now()),
  "action"       text                     not null,
  "details"      text,
  "performed_by" text                     not null,
  constraint "audit_logs_pkey" primary key (id)
);

alter table "public"."audit_logs"
  enable row level security;

alter table "public"."audit_logs"
  force row level security;

create table "public"."clients" (
  "id"           uuid                     not null default gen_random_uuid(),
  "company_name" text                     not null,
  "pic_name"     text,
  "email"        text,
  "phone"        text,
  "address"      text,
  "created_at"   timestamp with time zone not null default timezone('utc'::text, now()),
  constraint "clients_pkey" primary key (id)
);

create table "public"."contacts" (
  "id"            uuid                     not null default gen_random_uuid(),
  "contact_type"  text                     not null,
  "name"          text                     not null,
  "email"         text,
  "phone"         text                     not null,
  "service_role"  text,
  "bank_name"     text,
  "bank_account"  text,
  "customer_type" text,
  "pic_name"      text,
  "tin_no"        text,
  "ssm_no"        text,
  "address"       text,
  "postcode"      text,
  "city"          text,
  "state"         text,
  "country"       text                     default 'Malaysia'::text,
  "created_at"    timestamp with time zone not null default timezone('utc'::text, now()),
  "ic_no"         text,
  constraint "contacts_pkey" primary key (id)
);

alter table "public"."contacts"
  enable row level security;

alter table "public"."contacts"
  force row level security;

create table "public"."expenses" (
  "id"                uuid                     not null default gen_random_uuid(),
  "description"       text                     not null,
  "category"          text                     not null,
  "amount"            numeric                  not null,
  "created_at"        timestamp with time zone not null default timezone('utc'::text, now()),
  "receipt_url"       text,
  "date"              date,
  "title"             text,
  "status"            text,
  "payment_proof_url" text,
  constraint "expenses_pkey" primary key (id)
);

alter table "public"."expenses"
  enable row level security;

alter table "public"."expenses"
  force row level security;

create table "public"."invoices" (
  "id"             uuid                     not null default gen_random_uuid(),
  "client_name"    text                     not null,
  "amount"         numeric                  not null,
  "status"         text                     not null,
  "created_at"     timestamp with time zone not null default timezone('utc'::text, now()),
  "description"    text                     default 'Creative Services & Campaign Management'::text,
  "invoice_no"     text,
  "client_pic"     text,
  "client_address" text,
  "client_phone"   text,
  "client_email"   text,
  "due_date"       date,
  "notes"          text,
  "terms"          text,
  "items"          jsonb,
  "subtotal"       numeric,
  "discount"       numeric,
  "tax_amount"     numeric,
  "amount_paid"    numeric                  default 0,
  constraint "invoices_pkey" primary key (id)
);

alter table "public"."invoices"
  enable row level security;

alter table "public"."invoices"
  force row level security;

create table "public"."quotations" (
  "id"             uuid                     not null default gen_random_uuid(),
  "quote_no"       text                     not null,
  "client_name"    text                     not null,
  "date"           date                     not null,
  "valid_until"    date                     not null,
  "items"          jsonb                    not null default '[]'::jsonb,
  "subtotal"       numeric                  not null default 0,
  "discount"       numeric                  not null default 0,
  "tax_amount"     numeric                  not null default 0,
  "total"          numeric                  not null default 0,
  "notes"          text,
  "terms"          text,
  "status"         text                     not null default 'Draft'::text,
  "created_at"     timestamp with time zone not null default now(),
  "client_pic"     text,
  "client_address" text,
  "client_phone"   text,
  "client_email"   text,
  constraint "quotations_pkey" primary key (id)
);

alter table "public"."quotations"
  enable row level security;

alter table "public"."quotations"
  force row level security;

create table "public"."team_review_assignments" (
  "id"               text                     not null,
  "cycle_id"         text,
  "reviewer_name"    text                     not null,
  "reviewer_region"  text,
  "reviewee_name"    text                     not null,
  "reviewee_region"  text,
  "review_code_hash" text                     not null,
  "review_code_hint" text,
  "status"           text                     default 'pending'::text,
  "submitted_at"     timestamp with time zone,
  "created_at"       timestamp with time zone default now(),
  constraint "team_review_assignments_pkey" primary key (id)
);

create table "public"."team_review_cycles" (
  "id"         text                     not null,
  "title"      text                     not null,
  "status"     text                     default 'active'::text,
  "deadline"   date,
  "created_by" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  constraint "team_review_cycles_pkey" primary key (id)
);

create table "public"."team_review_responses" (
  "id"            text                     not null,
  "assignment_id" text,
  "cycle_id"      text,
  "reviewer_name" text                     not null,
  "reviewee_name" text                     not null,
  "ratings"       jsonb                    default '{}'::jsonb,
  "comments"      jsonb                    default '{}'::jsonb,
  "strengths"     text,
  "improvements"  text,
  "final_comment" text,
  "average_score" numeric,
  "submitted_at"  timestamp with time zone default now(),
  constraint "team_review_responses_pkey" primary key (id)
);

alter table "public"."team_review_assignments"
  add constraint "team_review_assignments_cycle_id_fkey" foreign key (cycle_id) references public.team_review_cycles(id) on delete cascade;

alter table "public"."team_review_responses"
  add constraint "team_review_responses_assignment_id_fkey" foreign key (assignment_id) references public.team_review_assignments(id) on delete cascade;

alter table "public"."team_review_responses"
  add constraint "team_review_responses_cycle_id_fkey" foreign key (cycle_id) references public.team_review_cycles(id) on delete cascade;

create index idx_team_review_assignments_code_hash on public.team_review_assignments using btree (review_code_hash);

create index idx_team_review_assignments_cycle_status on public.team_review_assignments using btree (cycle_id, status);

create index idx_team_review_cycles_created_at on public.team_review_cycles using btree (created_at desc);

create index idx_team_review_responses_assignment on public.team_review_responses using btree (assignment_id);

create index idx_team_review_responses_reviewee on public.team_review_responses using btree (reviewee_name, submitted_at desc);

create policy "assets_authenticated_all" on "public"."assets"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "audit_logs_authenticated_all" on "public"."audit_logs"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "contacts_authenticated_all" on "public"."contacts"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "expenses_authenticated_all" on "public"."expenses"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "invoices_authenticated_all" on "public"."invoices"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "quotations_authenticated_all" on "public"."quotations"
  for all
  to "authenticated"
  using (true)
  with check (true);

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."assets" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."audit_logs" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."clients" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."contacts" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."expenses" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."invoices" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quotations" to "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."team_review_assignments" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."team_review_cycles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."team_review_responses" to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

