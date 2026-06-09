import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function AccountingDocsPage() {
  const user = await requireUser()
  return <PortalLayout user={user}><PageHeader title="Accounting-guide" eyebrow="Dokumentation" description="Hur fakturor, verifikationer och exporter hänger ihop i Div3rsa Accounting." /><div className="grid gap-4 md:grid-cols-2"><section className="card p-5"><h2 className="text-xl font-black text-ink">Princip</h2><p className="mt-2 text-muted">Fakturering skapar kundfakturor. Accounting skapar verifikationer. En faktura ska inte automatiskt bokföras som posted utan kontroll; systemet skapar först utkast.</p></section><section className="card p-5"><h2 className="text-xl font-black text-ink">Standardförslag</h2><p className="mt-2 text-muted">För kundfaktura används normalt 1510 debet, 3001 kredit och 2611 kredit vid 25 % moms. Detta är en standardgrund och kan justeras i kontoplan/inställningar.</p></section><section className="card p-5"><h2 className="text-xl font-black text-ink">Subdomain</h2><p className="mt-2 text-muted">Accounting kan köras via accounting.div3rsa.com. Samma inloggning och tenantmodell används.</p></section><section className="card p-5"><h2 className="text-xl font-black text-ink">Export</h2><p className="mt-2 text-muted">SIE/CSV-exporten bygger på bokförda verifikationer. Kontrollera exporten innan den importeras i ett externt ekonomisystem.</p></section></div></PortalLayout>
}
