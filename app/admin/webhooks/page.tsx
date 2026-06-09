import { adminRetryWebhookDeliveryFormAction } from '@/lib/actions/webhooks'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminWebhooksPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const [{ data: endpoints }, { data: deliveries }] = await Promise.all([
    supabase.from('api_webhook_endpoints').select('*, payment_customers(company_name)').order('created_at', { ascending: false }).limit(100),
    supabase.from('api_webhook_deliveries').select('*, payment_customers(company_name)').order('created_at', { ascending: false }).limit(100),
  ])
  return <PortalLayout user={user}><PageHeader title="Webhooks" eyebrow="Admin" description="Överblick över endpoints, failed deliveries och retry." /><div className="space-y-5"><section className="card table-wrap"><table><thead><tr><th>Kund</th><th>Namn</th><th>URL</th><th>Status</th><th>Senaste fel</th></tr></thead><tbody>{(endpoints ?? []).map((endpoint: any) => <tr key={endpoint.id}><td>{endpoint.payment_customers?.company_name || '—'}</td><td>{endpoint.name || 'Webhook'}</td><td className="max-w-md truncate">{endpoint.url}</td><td>{endpoint.status}</td><td>{endpoint.last_error || '—'}</td></tr>)}</tbody></table></section><section className="card table-wrap"><table><thead><tr><th>Kund</th><th>Event</th><th>Status</th><th>HTTP</th><th>Fel</th><th></th></tr></thead><tbody>{(deliveries ?? []).map((delivery: any) => <tr key={delivery.id}><td>{delivery.payment_customers?.company_name || '—'}</td><td>{delivery.event_type}</td><td>{delivery.status}</td><td>{delivery.response_status || '—'}</td><td>{delivery.last_error || '—'}</td><td>{delivery.status !== 'delivered' ? <form action={adminRetryWebhookDeliveryFormAction}><input type="hidden" name="delivery_id" value={delivery.id} /><button className="font-bold text-ink">Retry</button></form> : null}</td></tr>)}</tbody></table></section></div></PortalLayout>
}
