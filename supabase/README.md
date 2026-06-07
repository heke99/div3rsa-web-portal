# Div3rsa Portal Supabase

Kör migrationen i samma Supabase-projekt som Div3rsa Web använder.

## Första superadmin

1. Skapa användaren i Supabase Auth manuellt eller via invite.
2. Lägg in raden i `portal_users` med samma auth user id:

```sql
insert into public.portal_users (id, email, full_name, role, status)
values ('AUTH_USER_ID_HÄR', 'hekmat.h@div3rsa.com', 'Hekmat', 'super_admin', 'active')
on conflict (id) do update set role = 'super_admin', status = 'active';
```

Ingen publik registrering ska vara aktiv för kunder. Kundkonton skapas via portalinbjudan från admin.
