-- Div3rsa Portal Batches 3.5-8
-- API hardening, webhooks, isolated accounting module, export foundation and portal documentation support.
-- Accounting is deliberately tenant-scoped and separated from invoicing. Invoicing creates source documents; accounting records journal entries.

create extension if not exists pgcrypto;

-- API rate limit foundation --------------------------------------------------
create table if not exists public.api_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid references public.payment_customers(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete cascade,
  route_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_api_rate_limit_events_lookup on public.api_rate_limit_events(api_key_id, route_key, created_at desc);

alter table public.api_request_logs add column if not exists request_id text;
create index if not exists idx_api_request_logs_request_id on public.api_request_logs(request_id);

-- Webhooks ------------------------------------------------------------------
alter table public.api_webhook_endpoints
  add column if not exists name text,
  add column if not exists signing_secret text,
  add column if not exists secret_tail text,
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_delivery_at timestamptz,
  add column if not exists last_error text,
  add column if not exists retry_count integer not null default 0;

alter table public.api_webhook_events
  add column if not exists source text not null default 'portal',
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

alter table public.api_webhook_deliveries
  add column if not exists response_status integer,
  add column if not exists response_body text,
  add column if not exists signature_header text,
  add column if not exists next_attempt_at timestamptz;

create index if not exists idx_api_webhook_events_customer_type on public.api_webhook_events(payment_customer_id, event_type, created_at desc);
create index if not exists idx_api_webhook_deliveries_endpoint_status on public.api_webhook_deliveries(webhook_endpoint_id, status, created_at desc);

-- Accounting app settings/access --------------------------------------------
create table if not exists public.accounting_settings (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade unique,
  accounting_method text not null default 'invoice_method' check (accounting_method in ('invoice_method','cash_method')),
  default_receivables_account text not null default '1510',
  default_bank_account text not null default '1930',
  default_revenue_account text not null default '3001',
  default_output_vat_account text not null default '2611',
  default_customer_loss_account text not null default '6350',
  default_rounding_account text not null default '3740',
  journal_series_invoice text not null default 'F',
  journal_series_payment text not null default 'B',
  sie_company_type text not null default 'AB',
  locked_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_fiscal_years (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','locked','closed')),
  locked_until date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_customer_id, starts_on, ends_on),
  check (ends_on >= starts_on)
);

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  account_number text not null,
  account_name text not null,
  account_class integer not null,
  account_type text not null check (account_type in ('asset','equity','liability','revenue','expense')),
  normal_balance text not null check (normal_balance in ('debit','credit')),
  vat_code text,
  is_active boolean not null default true,
  is_system_account boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_customer_id, account_number)
);

create table if not exists public.accounting_vat_codes (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  code text not null,
  description text not null,
  vat_rate numeric(8,4) not null default 25,
  output_vat_account text,
  input_vat_account text,
  sales_account text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_customer_id, code)
);

create table if not exists public.accounting_journal_series (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  fiscal_year_id uuid references public.accounting_fiscal_years(id) on delete cascade,
  series_code text not null,
  description text,
  next_voucher_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_customer_id, fiscal_year_id, series_code)
);

create table if not exists public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  fiscal_year_id uuid references public.accounting_fiscal_years(id) on delete restrict,
  series_code text not null default 'A',
  voucher_number integer,
  entry_date date not null default current_date,
  description text not null,
  source_type text not null default 'manual' check (source_type in ('manual','invoice_sent','invoice_paid','credit_invoice','opening_balance','adjustment','export_import')),
  source_id uuid,
  status text not null default 'draft' check (status in ('draft','posted','voided','reversed')),
  posted_at timestamptz,
  posted_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.accounting_journal_entries(id) on delete cascade,
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  account_number text not null,
  account_id uuid references public.accounting_accounts(id) on delete set null,
  debit_amount numeric(12,2) not null default 0,
  credit_amount numeric(12,2) not null default 0,
  vat_code text,
  line_description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (debit_amount >= 0 and credit_amount >= 0),
  check (not (debit_amount > 0 and credit_amount > 0))
);

create table if not exists public.accounting_customer_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  invoice_customer_id uuid references public.invoice_customers(id) on delete set null,
  journal_entry_id uuid references public.accounting_journal_entries(id) on delete set null,
  entry_type text not null check (entry_type in ('invoice','payment','credit','write_off')),
  amount numeric(12,2) not null,
  currency text not null default 'SEK',
  entry_date date not null default current_date,
  status text not null default 'open' check (status in ('open','cleared','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.accounting_exports (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  export_type text not null check (export_type in ('sie','csv','pdf_underlay')),
  status text not null default 'created' check (status in ('created','failed','downloaded','superseded')),
  period_start date,
  period_end date,
  file_name text,
  mime_type text,
  generated_content text,
  generated_by uuid references auth.users(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.accounting_export_items (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null references public.accounting_exports(id) on delete cascade,
  journal_entry_id uuid references public.accounting_journal_entries(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_checklist_items (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  checklist_key text not null,
  title text not null,
  status text not null default 'pending' check (status in ('pending','completed','skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_customer_id, checklist_key)
);

alter table public.accounting_connections
  add column if not exists app_url text,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.accounting_sync_jobs
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists journal_entry_id uuid references public.accounting_journal_entries(id) on delete set null;

alter table public.invoices
  add column if not exists accounting_journal_entry_id uuid references public.accounting_journal_entries(id) on delete set null;

create unique index if not exists idx_accounting_connections_customer_provider_unique on public.accounting_connections(payment_customer_id, provider);
create index if not exists idx_accounting_settings_customer on public.accounting_settings(payment_customer_id);
create index if not exists idx_accounting_fiscal_years_customer on public.accounting_fiscal_years(payment_customer_id, starts_on desc);
create index if not exists idx_accounting_accounts_customer on public.accounting_accounts(payment_customer_id, account_number);
create index if not exists idx_accounting_vat_codes_customer on public.accounting_vat_codes(payment_customer_id, code);
create index if not exists idx_accounting_journal_entries_customer on public.accounting_journal_entries(payment_customer_id, entry_date desc);
create index if not exists idx_accounting_journal_entries_source on public.accounting_journal_entries(source_type, source_id);
create index if not exists idx_accounting_journal_lines_entry on public.accounting_journal_lines(journal_entry_id);
create index if not exists idx_accounting_journal_lines_customer_account on public.accounting_journal_lines(payment_customer_id, account_number);
create index if not exists idx_accounting_exports_customer on public.accounting_exports(payment_customer_id, created_at desc);
create index if not exists idx_portal_checklist_customer on public.portal_checklist_items(payment_customer_id);

alter table public.api_rate_limit_events enable row level security;
alter table public.accounting_settings enable row level security;
alter table public.accounting_fiscal_years enable row level security;
alter table public.accounting_accounts enable row level security;
alter table public.accounting_vat_codes enable row level security;
alter table public.accounting_journal_series enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;
alter table public.accounting_customer_ledger_entries enable row level security;
alter table public.accounting_exports enable row level security;
alter table public.accounting_export_items enable row level security;
alter table public.portal_checklist_items enable row level security;

-- RLS helpers: API service role bypasses RLS, but policies keep browser reads tenant-safe.
drop policy if exists "API rate limit admin only" on public.api_rate_limit_events;
create policy "API rate limit admin only" on public.api_rate_limit_events for select using (public.is_portal_admin());

create policy "Accounting settings scoped" on public.accounting_settings for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting fiscal years scoped" on public.accounting_fiscal_years for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting accounts scoped" on public.accounting_accounts for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting vat codes scoped" on public.accounting_vat_codes for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting journal series scoped" on public.accounting_journal_series for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting journal entries scoped" on public.accounting_journal_entries for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting journal lines scoped" on public.accounting_journal_lines for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting ledger scoped" on public.accounting_customer_ledger_entries for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Accounting exports scoped" on public.accounting_exports for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
create policy "Portal checklist scoped" on public.portal_checklist_items for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

-- Tighten existing webhook table policies if missing from earlier migration.
drop policy if exists "API webhook events scoped" on public.api_webhook_events;
create policy "API webhook events scoped" on public.api_webhook_events for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "API webhook deliveries scoped" on public.api_webhook_deliveries;
create policy "API webhook deliveries scoped" on public.api_webhook_deliveries for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
