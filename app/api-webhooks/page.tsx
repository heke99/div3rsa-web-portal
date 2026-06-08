import { ApiKeyManager } from '@/components/api/ApiKeyManager'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function ApiWebhooksPage() {
  const user = await requireUser()
  const features = await getCustomerFeatures(user.customer_id)
  const enabled = featureEnabled(features, 'api_access')
  const supabase = createAdminClient()
  const [{ data: apiKeys }, { data: logs }] = enabled && user.customer_id ? await Promise.all([
    supabase.from('api_keys').select('id,name,key_prefix,key_tail,scopes,status,last_used_at,created_at').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }),
    supabase.from('api_request_logs').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(50),
  ]) : [{ data: [] }, { data: [] }]

  return (
    <PortalLayout user={user}>
      <PageHeader title="API & Webhooks" eyebrow="Automation" description="Skapa API-nycklar, styr scopes och följ API-anrop." />
      {enabled ? <ApiKeyManager apiKeys={apiKeys ?? []} logs={logs ?? []} /> : (
        <section className="card p-6">
          <h2 className="text-xl font-black text-ink">API kräver aktivering av Div3rsa</h2>
          <p className="mt-2 text-muted">Kontakta Div3rsa om ni vill skapa och skicka fakturor automatiskt via API.</p>
        </section>
      )}
    </PortalLayout>
  )
}
