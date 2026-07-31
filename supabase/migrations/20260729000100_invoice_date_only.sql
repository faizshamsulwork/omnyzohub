-- Omnyzo Hub invoice calendar-date fix
-- Problem observed in production rows:
--   Invoice issue dates were stored in public.invoices.created_at as timestamptz
--   values that represent Malaysia local midnight, for example:
--     2026-06-21T16:00:00+00:00 -> intended invoice date 2026-06-22
--
-- This migration makes invoice business dates date-only at the database layer.
-- It deliberately does not infer dates from invoice numbers.

do $$
declare
  created_at_type text;
  due_date_type text;
begin
  select data_type
    into created_at_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'invoices'
    and column_name = 'created_at';

  select data_type
    into due_date_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'invoices'
    and column_name = 'due_date';

  if created_at_type = 'timestamp with time zone' then
    alter table public.invoices alter column created_at drop default;
    alter table public.invoices
      alter column created_at type date
      using (created_at at time zone 'Asia/Kuala_Lumpur')::date;
    alter table public.invoices alter column created_at set default current_date;
  elsif created_at_type = 'timestamp without time zone' then
    alter table public.invoices alter column created_at drop default;
    alter table public.invoices
      alter column created_at type date
      using created_at::date;
    alter table public.invoices alter column created_at set default current_date;
  elsif created_at_type = 'date' then
    null;
  else
    raise exception 'Unsupported public.invoices.created_at type: %', created_at_type;
  end if;

  if due_date_type is null then
    null;
  elsif due_date_type <> 'date' then
    alter table public.invoices
      alter column due_date type date
      using due_date::date;
  end if;
end $$;
