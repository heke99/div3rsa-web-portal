-- Div3rsa Portal Invoice Foundation
-- Batch 0/1: feature access, invoice customers, invoices, events, email logs, and accounting/API placeholders.

create extension if not exists pgcrypto;

-- Shared email log used by portal invites and application notifications if not already present in the web database.
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid,
  customer_id uuid references public.payment_customers(id) on delete cascade,
  email_type text,
  recipient text not null,
  subject text not null,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.company_features (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.payment_customers(id) on delete cascade,
  feature_key text not null check (feature_key in (
    'invoicing',
    'recurring_invoices',
    'invoice_templates',
    'invoice_pdf',
    'api_access',
    'api_invoice_send',
    'api_webhooks',
    'accounting',
    'bookkeeping_sync',
    'external_accounting_export'
  )),
  enabled boolean not null default false,
  enabled_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, feature_key)
);

create table if not exists public.invoice_customers (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  customer_type text not null default 'company' check (customer_type in ('company','person','eu_company','outside_eu')),
  name text not null,
  organization_number text,
  contact_person text,
  email text not null,
  phone text,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  city text,
  country text not null default 'SE',
  invoice_reference text,
  default_payment_terms_days integer not null default 30,
  default_vat_rate numeric(8,4) not null default 25,
  currency text not null default 'SEK',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  invoice_customer_id uuid not null references public.invoice_customers(id) on delete restrict,
  invoice_number text,
  status text not null default 'draft' check (status in ('draft','ready_to_send','sent','delivered','viewed','paid','overdue','cancelled','credited','failed')),
  accounting_sync_status text not null default 'not_enabled' check (accounting_sync_status in ('not_enabled','not_connected','pending_connection_approval','queued','syncing','synced','failed','skipped')),
  source text not null default 'portal' check (source in ('portal','api','recurring')),
  issue_date date not null default current_date,
  due_date date not null,
  currency text not null default 'SEK',
  subtotal_amount numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  pdf_url text,
  pdf_generated_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_customer_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,4) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(8,4) not null default 25,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_number_sequences (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  year integer not null,
  prefix text not null,
  next_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_customer_id, year)
);

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  event_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_email_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  recipient text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at date not null default current_date,
  reference text,
  method text not null default 'manual',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  name text not null,
  description text,
  currency text not null default 'SEK',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.invoice_templates(id) on delete cascade,
  description text not null,
  quantity numeric(12,4) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(8,4) not null default 25,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_invoice_schedules (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  invoice_customer_id uuid references public.invoice_customers(id) on delete restrict,
  title text not null,
  frequency text not null default 'monthly' check (frequency in ('monthly','quarterly','yearly','custom')),
  start_date date not null default current_date,
  end_date date,
  next_run_date date,
  auto_send boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','ended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_invoice_schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.recurring_invoice_schedules(id) on delete cascade,
  description text not null,
  quantity numeric(12,4) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(8,4) not null default 25,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_invoice_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.recurring_invoice_schedules(id) on delete cascade,
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  status text not null default 'created' check (status in ('created','sent','failed','skipped')),
  error_message text,
  run_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.document_attachments (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.accounting_connections (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  provider text not null default 'internal',
  status text not null default 'pending_review' check (status in ('disconnected','pending_review','approved','rejected','revoked','error')),
  external_company_id text,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  provider text not null default 'internal',
  status text not null default 'queued' check (status in ('queued','syncing','synced','failed','resolved','skipped')),
  attempts integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_sync_events (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid references public.accounting_sync_jobs(id) on delete cascade,
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  event_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- API placeholders for later batches.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','revoked','expired')),
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid references public.payment_customers(id) on delete set null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  method text not null,
  path text not null,
  status_code integer,
  request_id text,
  ip_address text,
  user_agent text,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.api_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  url text not null,
  description text,
  secret_hash text,
  status text not null default 'active' check (status in ('active','disabled','failed')),
  events text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table if not exists public.api_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  webhook_endpoint_id uuid references public.api_webhook_endpoints(id) on delete cascade,
  webhook_event_id uuid references public.api_webhook_events(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','delivered','failed','retrying','disabled')),
  attempts integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_features_customer on public.company_features(customer_id, feature_key);
create index if not exists idx_invoice_customers_customer on public.invoice_customers(payment_customer_id);
create index if not exists idx_invoices_customer_status on public.invoices(payment_customer_id, status);
create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_invoice_events_invoice on public.invoice_events(invoice_id, created_at desc);
create index if not exists idx_invoice_email_logs_invoice on public.invoice_email_logs(invoice_id, created_at desc);
create index if not exists idx_accounting_sync_jobs_customer_status on public.accounting_sync_jobs(payment_customer_id, status);
create index if not exists idx_api_request_logs_customer_created on public.api_request_logs(payment_customer_id, created_at desc);
create index if not exists idx_api_webhook_deliveries_customer_status on public.api_webhook_deliveries(payment_customer_id, status);

alter table public.email_logs enable row level security;
alter table public.company_features enable row level security;
alter table public.invoice_customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_number_sequences enable row level security;
alter table public.invoice_events enable row level security;
alter table public.invoice_email_logs enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_templates enable row level security;
alter table public.invoice_template_items enable row level security;
alter table public.recurring_invoice_schedules enable row level security;
alter table public.recurring_invoice_schedule_items enable row level security;
alter table public.recurring_invoice_runs enable row level security;
alter table public.document_attachments enable row level security;
alter table public.accounting_connections enable row level security;
alter table public.accounting_sync_jobs enable row level security;
alter table public.accounting_sync_events enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.api_webhook_endpoints enable row level security;
alter table public.api_webhook_events enable row level security;
alter table public.api_webhook_deliveries enable row level security;

-- Direct customer-scoped policies for key tables. Service role is used by server actions, but RLS remains safe for client access.
drop policy if exists "Email logs readable by owner or admin" on public.email_logs;
create policy "Email logs readable by owner or admin" on public.email_logs for select using (public.is_portal_admin() or customer_id = public.portal_customer_id());
drop policy if exists "Email logs insert by admin" on public.email_logs;
create policy "Email logs insert by admin" on public.email_logs for insert with check (public.is_portal_admin() or customer_id = public.portal_customer_id());

drop policy if exists "Company features readable by owner or admin" on public.company_features;
create policy "Company features readable by owner or admin" on public.company_features for select using (public.is_portal_admin() or customer_id = public.portal_customer_id());
drop policy if exists "Company features managed by admin" on public.company_features;
create policy "Company features managed by admin" on public.company_features for all using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Invoice customers scoped" on public.invoice_customers;
create policy "Invoice customers scoped" on public.invoice_customers for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Invoices scoped" on public.invoices;
create policy "Invoices scoped" on public.invoices for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Invoice items scoped" on public.invoice_items;
create policy "Invoice items scoped" on public.invoice_items for all using (
  public.is_portal_admin() or exists (select 1 from public.invoices i where i.id = invoice_id and i.payment_customer_id = public.portal_customer_id())
) with check (
  public.is_portal_admin() or exists (select 1 from public.invoices i where i.id = invoice_id and i.payment_customer_id = public.portal_customer_id())
);

drop policy if exists "Invoice sequence scoped" on public.invoice_number_sequences;
create policy "Invoice sequence scoped" on public.invoice_number_sequences for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Invoice events scoped" on public.invoice_events;
create policy "Invoice events scoped" on public.invoice_events for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Invoice email logs scoped" on public.invoice_email_logs;
create policy "Invoice email logs scoped" on public.invoice_email_logs for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Invoice payments scoped" on public.invoice_payments;
create policy "Invoice payments scoped" on public.invoice_payments for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Accounting connections scoped" on public.accounting_connections;
create policy "Accounting connections scoped" on public.accounting_connections for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Accounting jobs scoped" on public.accounting_sync_jobs;
create policy "Accounting jobs scoped" on public.accounting_sync_jobs for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

drop policy if exists "Accounting events scoped" on public.accounting_sync_events;
create policy "Accounting events scoped" on public.accounting_sync_events for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());

-- Broad admin/customer read policies for batch-prepared tables.
drop policy if exists "Invoice templates scoped" on public.invoice_templates;
create policy "Invoice templates scoped" on public.invoice_templates for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "Recurring schedules scoped" on public.recurring_invoice_schedules;
create policy "Recurring schedules scoped" on public.recurring_invoice_schedules for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "Recurring runs scoped" on public.recurring_invoice_runs;
create policy "Recurring runs scoped" on public.recurring_invoice_runs for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "Documents scoped" on public.document_attachments;
create policy "Documents scoped" on public.document_attachments for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "API keys scoped" on public.api_keys;
create policy "API keys scoped" on public.api_keys for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "API request logs scoped" on public.api_request_logs;
create policy "API request logs scoped" on public.api_request_logs for select using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
drop policy if exists "API webhooks scoped" on public.api_webhook_endpoints;
create policy "API webhooks scoped" on public.api_webhook_endpoints for all using (public.is_portal_admin() or payment_customer_id = public.portal_customer_id()) with check (public.is_portal_admin() or payment_customer_id = public.portal_customer_id());
