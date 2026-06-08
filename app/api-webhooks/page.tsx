import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

export const dynamic = 'force-dynamic'

export default async function ApiWebhooksPage() {
  const user = await requireUser()
  const features = await getCustomerFeatures(user.customer_id)
  const enabled = featureEnabled(features, 'api_access')
  return (
    <PortalLayout user={user}>
      <PageHeader title="API & Webhooks" eyebrow="Automation" description="API-åtkomst aktiveras av Div3rsa per kund." />
      <section className="card p-6">
        {enabled ? (
          <div><h2 className="text-xl font-black text-ink">API är aktiverat</h2><p className="mt-2 text-muted">Nästa batch bygger API-nycklar, scopes, logs och webhooks ovanpå fakturamotorn.</p></div>
        ) : (
          <div><h2 className="text-xl font-black text-ink">API kräver aktivering av Div3rsa</h2><p className="mt-2 text-muted">Kontakta Div3rsa om ni vill skapa och skicka fakturor automatiskt via API.</p></div>
        )}
      </section>
    </PortalLayout>
  )
}
