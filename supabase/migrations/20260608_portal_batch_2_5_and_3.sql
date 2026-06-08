-- Batch 2.5 + Batch 3: articles/products, invoice settings, admin cleanup and invoice API foundation.

create table if not exists public.invoice_products (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade,
  name text not null,
  description text,
  sku text,
  unit text not null default 'st',
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(8,4) not null default 25,
  currency text not null default 'SEK',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_settings (
  id uuid primary key default gen_random_uuid(),
  payment_customer_id uuid not null references public.payment_customers(id) on delete cascade unique,
  invoice_prefix text,
  default_payment_terms_days integer not null default 30,
  default_currency text not null default 'SEK',
  default_vat_rate numeric(8,4) not null default 25,
  seller_name text,
  seller_org_number text,
  seller_address_line_1 text,
  seller_address_line_2 text,
  seller_postal_code text,
  seller_city text,
  seller_country text not null default 'SE',
  seller_email text,
  bankgiro text,
  plusgiro text,
  iban text,
  bank_account text,
  invoice_footer_text text,
  invoice_terms_text text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoice_items
  add column if not exists product_id uuid references public.invoice_products(id) on delete set null,
  add column if not exists product_name_snapshot text,
  add column if not exists sku_snapshot text,
  add column if not exists unit text not null default 'st';

alter table public.invoice_template_items
  add column if not exists product_id uuid references public.invoice_products(id) on delete set null,
  add column if not exists product_name_snapshot text,
  add column if not exists sku_snapshot text,
  add column if not exists unit text not null default 'st';

alter table public.recurring_invoice_schedule_items
  add column if not exists product_id uuid references public.invoice_products(id) on delete set null,
  add column if not exists product_name_snapshot text,
  add column if not exists sku_snapshot text,
  add column if not exists unit text not null default 'st';

alter table public.invoices
  add column if not exists invoice_type text not null default 'invoice',
  add column if not exists credited_invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists credit_reason text;

alter table public.payment_applications
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists delete_reason text;

alter table public.api_keys
  add column if not exists key_tail text,
  add column if not exists expires_at timestamptz;

create index if not exists idx_invoice_products_customer on public.invoice_products(payment_customer_id);
create index if not exists idx_invoice_products_customer_active on public.invoice_products(payment_customer_id, is_active);
create index if not exists idx_invoice_settings_customer on public.invoice_settings(payment_customer_id);
create index if not exists idx_invoice_items_product on public.invoice_items(product_id);
create index if not exists idx_payment_applications_archived on public.payment_applications(archived_at);
create index if not exists idx_payment_applications_deleted on public.payment_applications(deleted_at);
create index if not exists idx_invoices_invoice_type on public.invoices(invoice_type);
create index if not exists idx_api_keys_hash on public.api_keys(key_hash);
create index if not exists idx_api_keys_customer_status on public.api_keys(payment_customer_id, status);

alter table public.invoice_products enable row level security;
alter table public.invoice_settings enable row level security;

drop policy if exists "Invoice products scoped" on public.invoice_products;
create policy "Invoice products scoped" on public.invoice_products for all using (
  public.is_portal_admin() or payment_customer_id = public.portal_customer_id()
) with check (
  public.is_portal_admin() or payment_customer_id = public.portal_customer_id()
);

drop policy if exists "Invoice settings scoped" on public.invoice_settings;
create policy "Invoice settings scoped" on public.invoice_settings for all using (
  public.is_portal_admin() or payment_customer_id = public.portal_customer_id()
) with check (
  public.is_portal_admin() or payment_customer_id = public.portal_customer_id()
);
