import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function AdminApiPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const [{ data: keys }, { data: logs }] = await Promise.all([
    supabase.from('api_keys').select('*, payment_customers(company_name,email)').order('created_at', { ascending: false }).limit(100),
    supabase.from('api_request_logs').select('*, payment_customers(company_name)').order('created_at', { ascending: false }).limit(100),
  ])
  return (
    <PortalLayout user={user}>
      <PageHeader title="API" eyebrow="Admin" description="Överblick över kundernas API-nycklar och senaste API-anrop." />
      <section className="card table-wrap mb-5">
        <table><thead><tr><th>Kund</th><th>Nyckel</th><th>Status</th><th>Scopes</th><th>Senast använd</th></tr></thead><tbody>{(keys ?? []).map((key: any) => <tr key={key.id}><td>{key.payment_customers?.company_name || '—'}</td><td>{key.name}<div className="text-sm text-muted">{key.key_prefix}…{key.key_tail || ''}</div></td><td>{key.status}</td><td><span className="text-sm text-muted">{Array.isArray(key.scopes) ? key.scopes.join(', ') : '—'}</span></td><td>{formatDate(key.last_used_at)}</td></tr>)}</tbody></table>
      </section>
      <section className="card table-wrap">
        <table><thead><tr><th>Kund</th><th>Metod</th><th>Path</th><th>Status</th><th>Fel</th><th>Datum</th></tr></thead><tbody>{(logs ?? []).map((log: any) => <tr key={log.id}><td>{log.payment_customers?.company_name || '—'}</td><td>{log.method}</td><td>{log.path}</td><td>{log.status_code || '—'}</td><td>{log.error_message || '—'}</td><td>{formatDate(log.created_at)}</td></tr>)}</tbody></table>
      </section>
    </PortalLayout>
  )
}
