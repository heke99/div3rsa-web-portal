-- Div3rsa Portal manual password onboarding
-- Superadmin sets the first password manually. The customer must change it after first login.

alter table if exists public.portal_users add column if not exists onboarding_status text not null default 'active';
alter table if exists public.portal_users add column if not exists password_changed_at timestamptz;
alter table if exists public.portal_users add column if not exists manual_password_set_at timestamptz;
alter table if exists public.portal_users add column if not exists manual_password_set_by uuid references auth.users(id) on delete set null;
alter table if exists public.portal_users add column if not exists disabled_at timestamptz;

update public.portal_users
set onboarding_status = case
  when status = 'active' and must_change_password = true then 'pending_password_change'
  when status = 'active' then 'active'
  when status = 'inactive' then 'disabled'
  else coalesce(onboarding_status, 'active')
end
where onboarding_status is null;

create index if not exists idx_portal_users_onboarding_status on public.portal_users(onboarding_status);
create index if not exists idx_portal_users_manual_password_set_by on public.portal_users(manual_password_set_by);
