import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const user = await requireUser()
  return <PortalLayout user={user}><PageHeader title="Guider" eyebrow="Hjälp" description="Korta guider för fakturering, API, webhooks och accounting." /><div className="grid gap-4 md:grid-cols-2"><Doc href="/api-webhooks" title="API & Webhooks" text="Skapa nycklar, scopes, test-webhooks och curl-exempel." /><Doc href="/accounting/docs" title="Accounting" text="Hur fakturor kopplas till verifikationer och exporter." /><Doc href="/invoices/new" title="Skapa faktura" text="Välj kund, artiklar, egna rader och spara/skicka." /><Doc href="/settings/invoice" title="Fakturainställningar" text="Lägg in betalningsuppgifter, prefix, moms och footer." /></div></PortalLayout>
}
function Doc({ href, title, text }: { href: string; title: string; text: string }) { return <Link href={href} className="card block p-5 hover:shadow-card"><h2 className="text-xl font-black text-ink">{title}</h2><p className="mt-2 text-muted">{text}</p></Link> }
