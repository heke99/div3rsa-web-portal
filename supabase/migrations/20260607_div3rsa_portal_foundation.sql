-- Div3rsa Portal foundation
-- Use the same Supabase project as div3rsa-web.

create extension if not exists pgcrypto;

create table if not exists public.payment_customers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.payment_applications(id) on delete set null,
  company_name text not null,
  org_number text,
  contact_name text,
  email text,
  phone text,
  status text not null default 'draft' check (status in ('draft','awaiting_partner','onboarding','active','paused','rejected','cancelled')),
  partner_status text not null default 'not_started',
  portal_status text not null default 'not_invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz
);

create table if not exists public.payment_customer_pricing (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.payment_customers(id) on delete cascade,
  setup_fee numeric(12,2),
  monthly_fee numeric(12,2),
  fee_per_invoice numeric(12,2),
  percentage_fee_per_invoice numeric(8,4),
  minimum_monthly_fee numeric(12,2),
  api_monthly_fee numeric(12,2),
  extra_user_fee numeric(12,2),
  support_fee numeric(12,2),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly','quarterly','yearly')),
  currency text not null default 'SEK',
  vat_rate numeric(8,4) not null default 25,
  valid_from date not null default current_date,
  valid_until timestamptz,
  status text not null default 'active' check (status in ('active','archived','draft')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_pricing_audit_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.payment_customers(id) on delete cascade,
  pricing_id uuid references public.payment_customer_pricing(id) on delete set null,
  changed_by uuid references auth.users(id) on delete set null,
  change_type text not null,
  old_values jsonb,
  new_values jsonb,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('super_admin','admin','support','customer_admin','customer_user')),
  customer_id uuid references public.payment_customers(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','invited','blocked')),
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_invites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.payment_customers(id) on delete cascade,
  email text not null,
  role text not null default 'customer_admin' check (role in ('customer_admin','customer_user')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.payment_customers(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open','waiting_customer','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text,
  message text not null,
  created_at timestamptz not null default now()
);

-- Ensure web tables have useful columns when portal reads them.
alter table if exists public.payment_applications add column if not exists updated_at timestamptz not null default now();
alter table if exists public.payment_applications add column if not exists admin_notification_status text;
alter table if exists public.payment_applications add column if not exists customer_confirmation_status text;

create index if not exists idx_payment_customers_application_id on public.payment_customers(application_id);
create index if not exists idx_payment_customers_status on public.payment_customers(status);
create index if not exists idx_payment_customer_pricing_customer_status on public.payment_customer_pricing(customer_id, status);
create index if not exists idx_portal_users_customer_id on public.portal_users(customer_id);
create index if not exists idx_portal_invites_token_hash on public.portal_invites(token_hash);
create index if not exists idx_support_tickets_customer_status on public.support_tickets(customer_id, status);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portal_users u
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('super_admin','admin','support')
  );
$$;

create or replace function public.portal_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.customer_id from public.portal_users u
  where u.id = auth.uid() and u.status = 'active'
  limit 1;
$$;

alter table public.payment_customers enable row level security;
alter table public.payment_customer_pricing enable row level security;
alter table public.payment_pricing_audit_logs enable row level security;
alter table public.portal_users enable row level security;
alter table public.portal_invites enable row level security;
alter table public.audit_logs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- Admin policies
-- Recreate policies idempotently because Postgres does not support CREATE POLICY IF NOT EXISTS consistently.
drop policy if exists "Admins can read payment customers" on public.payment_customers;
create policy "Admins can read payment customers" on public.payment_customers for select using (public.is_portal_admin() or id = public.portal_customer_id());
drop policy if exists "Admins can manage payment customers" on public.payment_customers;
create policy "Admins can manage payment customers" on public.payment_customers for all using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Admins can read pricing" on public.payment_customer_pricing;
create policy "Admins can read pricing" on public.payment_customer_pricing for select using (public.is_portal_admin() or customer_id = public.portal_customer_id());
drop policy if exists "Admins can manage pricing" on public.payment_customer_pricing;
create policy "Admins can manage pricing" on public.payment_customer_pricing for all using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Admins can read pricing audit" on public.payment_pricing_audit_logs;
create policy "Admins can read pricing audit" on public.payment_pricing_audit_logs for select using (public.is_portal_admin());
drop policy if exists "Admins can insert pricing audit" on public.payment_pricing_audit_logs;
create policy "Admins can insert pricing audit" on public.payment_pricing_audit_logs for insert with check (public.is_portal_admin());

drop policy if exists "Users can read own portal profile" on public.portal_users;
create policy "Users can read own portal profile" on public.portal_users for select using (id = auth.uid() or public.is_portal_admin());
drop policy if exists "Admins can manage portal users" on public.portal_users;
create policy "Admins can manage portal users" on public.portal_users for all using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Admins can manage invites" on public.portal_invites;
create policy "Admins can manage invites" on public.portal_invites for all using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs" on public.audit_logs for select using (public.is_portal_admin());
drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs" on public.audit_logs for insert with check (public.is_portal_admin() or actor_user_id = auth.uid());

drop policy if exists "Support tickets read" on public.support_tickets;
create policy "Support tickets read" on public.support_tickets for select using (public.is_portal_admin() or customer_id = public.portal_customer_id());
drop policy if exists "Customers create support tickets" on public.support_tickets;
create policy "Customers create support tickets" on public.support_tickets for insert with check (customer_id = public.portal_customer_id() or public.is_portal_admin());
drop policy if exists "Admins manage support tickets" on public.support_tickets;
create policy "Admins manage support tickets" on public.support_tickets for update using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists "Support messages read" on public.support_ticket_messages;
create policy "Support messages read" on public.support_ticket_messages for select using (
  public.is_portal_admin() or exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.customer_id = public.portal_customer_id()
  )
);
drop policy if exists "Support messages insert" on public.support_ticket_messages;
create policy "Support messages insert" on public.support_ticket_messages for insert with check (
  public.is_portal_admin() or exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.customer_id = public.portal_customer_id()
  )
);
