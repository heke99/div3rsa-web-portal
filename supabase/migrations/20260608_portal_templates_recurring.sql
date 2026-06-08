-- Batch 2: invoice templates and recurring invoices hardening.

alter table public.invoices
  add column if not exists invoice_template_id uuid references public.invoice_templates(id) on delete set null,
  add column if not exists recurring_schedule_id uuid references public.recurring_invoice_schedules(id) on delete set null;

alter table public.recurring_invoice_schedules
  add column if not exists currency text not null default 'SEK',
  add column if not exists payment_terms_days integer not null default 30 check (payment_terms_days >= 0),
  add column if not exists custom_interval_months integer not null default 1 check (custom_interval_months >= 1);

alter table public.recurring_invoice_runs
  add column if not exists generated_for_date date not null default current_date;

create index if not exists idx_invoice_templates_customer_created on public.invoice_templates(payment_customer_id, created_at desc);
create index if not exists idx_invoice_template_items_template on public.invoice_template_items(template_id, sort_order);
create index if not exists idx_recurring_schedules_customer_status on public.recurring_invoice_schedules(payment_customer_id, status, next_run_date);
create index if not exists idx_recurring_schedule_items_schedule on public.recurring_invoice_schedule_items(schedule_id, sort_order);
create index if not exists idx_recurring_runs_schedule_date on public.recurring_invoice_runs(schedule_id, generated_for_date desc);
create unique index if not exists recurring_invoice_runs_schedule_generated_date_unique on public.recurring_invoice_runs(schedule_id, generated_for_date);

-- Policies for child rows prepared in Batch 1 but now used by UI/actions.
drop policy if exists "Invoice template items scoped" on public.invoice_template_items;
create policy "Invoice template items scoped" on public.invoice_template_items for all using (
  public.is_portal_admin() or exists (
    select 1 from public.invoice_templates t
    where t.id = template_id and t.payment_customer_id = public.portal_customer_id()
  )
) with check (
  public.is_portal_admin() or exists (
    select 1 from public.invoice_templates t
    where t.id = template_id and t.payment_customer_id = public.portal_customer_id()
  )
);

drop policy if exists "Recurring schedule items scoped" on public.recurring_invoice_schedule_items;
create policy "Recurring schedule items scoped" on public.recurring_invoice_schedule_items for all using (
  public.is_portal_admin() or exists (
    select 1 from public.recurring_invoice_schedules s
    where s.id = schedule_id and s.payment_customer_id = public.portal_customer_id()
  )
) with check (
  public.is_portal_admin() or exists (
    select 1 from public.recurring_invoice_schedules s
    where s.id = schedule_id and s.payment_customer_id = public.portal_customer_id()
  )
);
