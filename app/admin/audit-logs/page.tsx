import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export default async function AuditLogsPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
  return (
    <PortalLayout user={user}>
      <PageHeader title="Audit logs" description="Spårbarhet för viktiga händelser i portalen." />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Tid</th><th>Användare</th><th>Roll</th><th>Åtgärd</th><th>Objekt</th></tr></thead>
          <tbody>{(logs ?? []).map((log: any) => <tr key={log.id}><td>{formatDate(log.created_at)}</td><td>{log.actor_user_id || '—'}</td><td>{log.actor_role || '—'}</td><td>{log.action}</td><td>{log.entity_type}<br/><span className="text-xs text-muted">{log.entity_id}</span></td></tr>)}</tbody>
        </table>
      </div>
    </PortalLayout>
  )
}
