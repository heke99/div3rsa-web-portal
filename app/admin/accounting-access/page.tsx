import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function AdminAccountingAccessPage() {
  const user = await requireAdmin()
  return (
    <PortalLayout user={user}>
      <PageHeader title="Accounting" eyebrow="Admin" description="Accounting-access styrs per kund. Full accounting och sync jobs byggs i senare batch." />
      <section className="card p-6"><h2 className="text-xl font-black text-ink">Accounting access förberedd</h2><p className="mt-2 text-muted">Aktivera Accounting och bookkeeping_sync på kundkortet när kunden ska få tillgång.</p></section>
    </PortalLayout>
  )
}
