# Div3rsa Portal

Kundportal och adminpanel för Div3rsa.

## Domän

- Lokal: `http://localhost:3000`
- Produktion: `https://portal.div3rsa.com`

## Koppling

Portalen ska använda samma Supabase-projekt som `div3rsa.com`, så ansökningar från webben kan hanteras direkt i adminpanelen.

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
RESEND_API_KEY=
MAIL_FROM=info@div3rsa.com
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

Kör migrationen:

```txt
supabase/migrations/20260607_div3rsa_portal_foundation.sql
```

Skapa därefter första superadmin enligt `supabase/README.md`.

## MVP-funktioner

- Login
- Adminöversikt
- Ansökningslista från webben
- Ansökningsdetalj
- Statusändring
- Interna anteckningar
- Skapa kund från ansökan
- Kundlista och kundkort
- Kundspecifik prissättning med audit
- Portalinbjudan via aktiveringslänk
- Aktiveringssida
- Kunddashboard
- Onboardingvy
- Prisvy
- Supportärenden
- Audit logs

## Ej byggt ännu

- Full fakturaskapare
- Capway API-integration
- KYC-uppladdning
- BankID
- Bokföringsexport
