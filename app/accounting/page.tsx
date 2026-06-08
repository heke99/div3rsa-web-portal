import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

export const dynamic = 'force-dynamic'

export default async function AccountingPage() {
  const user = await requireUser()
  const features = await getCustomerFeatures(user.customer_id)
  const enabled = featureEnabled(features, 'accounting')
  return (
    <PortalLayout user={user}>
      <PageHeader title="Accounting" eyebrow="Bokföring" description="Accounting aktiveras av Div3rsa och kopplas senare till bokföringssynk." />
      <section className="card p-6">
        {enabled ? (
          <div><h2 className="text-xl font-black text-ink">Accounting är aktiverat</h2><p className="mt-2 text-muted">Nästa batch bygger accounting connections, sync jobs och dashboard.</p></div>
        ) : (
          <div><h2 className="text-xl font-black text-ink">Accounting kräver aktivering av Div3rsa</h2><p className="mt-2 text-muted">När modulen är aktiverad kan fakturor bokföras/synkas automatiskt efter godkänd anslutning.</p></div>
        )}
      </section>
    </PortalLayout>
  )
}
