import { ApiDocumentation } from '@/components/api/ApiDocumentation'
import { ApiKeyManager } from '@/components/api/ApiKeyManager'
import { WebhookManager } from '@/components/webhooks/WebhookManager'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function ApiWebhooksPage() {
  const user = await requireUser()
  const features = await getCustomerFeatures(user.customer_id)
  const apiEnabled = featureEnabled(features, 'api_access')
  const webhooksEnabled = featureEnabled(features, 'api_webhooks')
  const supabase = createAdminClient()
  const [{ data: apiKeys }, { data: logs }, { data: endpoints }, { data: deliveries }] = apiEnabled && user.customer_id ? await Promise.all([
    supabase.from('api_keys').select('id,name,key_prefix,key_tail,scopes,status,last_used_at,created_at').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }),
    supabase.from('api_request_logs').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(50),
    supabase.from('api_webhook_endpoints').select('id,name,url,description,secret_tail,status,events,last_tested_at,last_delivery_at,last_error,created_at').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }),
    supabase.from('api_webhook_deliveries').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(50),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  return (
    <PortalLayout user={user}>
      <PageHeader title="API & Webhooks" eyebrow="Automation" description="Skapa API-nycklar, styr scopes, följ API-anrop och leverera webhook-events." />
      {apiEnabled ? <div className="space-y-6"><ApiKeyManager apiKeys={apiKeys ?? []} logs={logs ?? []} /><ApiDocumentation />{webhooksEnabled ? <WebhookManager endpoints={endpoints ?? []} deliveries={deliveries ?? []} /> : <section className="card p-6"><h2 className="text-xl font-black text-ink">Webhooks kräver aktivering av Div3rsa</h2><p className="mt-2 text-muted">API är aktivt, men webhooks är inte aktiverat för ert bolag ännu.</p></section>}</div> : (
        <section className="card p-6"><h2 className="text-xl font-black text-ink">API kräver aktivering av Div3rsa</h2><p className="mt-2 text-muted">Kontakta Div3rsa om ni vill skapa och skicka fakturor automatiskt via API.</p></section>
      )}
    </PortalLayout>
  )
}
