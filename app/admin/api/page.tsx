import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function AdminApiPage() {
  const user = await requireAdmin()
  return (
    <PortalLayout user={user}>
      <PageHeader title="API" eyebrow="Admin" description="API-access, nycklar och webhooks byggs i API-batchen. Första batchen förbereder feature access och fakturagrunden." />
      <section className="card p-6"><h2 className="text-xl font-black text-ink">API foundation förberedd</h2><p className="mt-2 text-muted">Aktivera API per kund via kundkortets modulhantering när API-batchen byggs klart.</p></section>
    </PortalLayout>
  )
}
