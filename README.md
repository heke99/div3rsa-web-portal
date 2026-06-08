# Div3rsa Portal

Kundportal och adminpanel för Div3rsa.

## Domän

- Lokal: `http://localhost:3000`
- Produktion: `https://portal.div3rsa.com`

## Koppling

Portalen använder samma Supabase-projekt som `div3rsa.com`, så ansökningar från webben kan hanteras direkt i adminpanelen.

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Miljövariabler

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=true
SMTP_FROM="Div3rsa AB <no-reply@div3rsa.com>"
ADMIN_NOTIFICATION_EMAIL=info@div3rsa.com
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
MARKETING_URL=https://div3rsa.com
NEXT_PUBLIC_MARKETING_URL=https://div3rsa.com
```

I Vercel:

```env
APP_URL=https://portal.div3rsa.com
NEXT_PUBLIC_APP_URL=https://portal.div3rsa.com
```

## Supabase

Kör migrationerna i ordning:

```txt
supabase/migrations/20260607_div3rsa_portal_foundation.sql
supabase/migrations/20260608_portal_invoice_foundation.sql
```

Skapa därefter första superadmin enligt `supabase/README.md`.

## Byggda funktioner

- Login
- Adminöversikt
- Ansökningslista från webben
- Ansökningsdetalj
- Statusändring
- Interna anteckningar
- Skapa kund från ansökan
- Kundlista och kundkort
- Kundspecifik prissättning med audit
- Portalinbjudan via SMTP och aktiveringslänk
- Aktiveringssida
- Kunddashboard
- Kundregister för fakturamottagare
- Fakturautkast
- Skickade fakturor
- PDF-ready fakturavy
- SMTP-fakturautskick
- Fakturahändelser och mail-loggar
- Adminvy för fakturor
- Feature access för invoicing, API och Accounting
- Supportärenden
- Audit logs

## Förberett men byggs vidare i senare batcher

- Fakturamallar
- Återkommande fakturor
- API-nycklar och webhooks
- Accounting connections och sync jobs
- Native accounting engine
- Externa bokföringsintegrationer/export
