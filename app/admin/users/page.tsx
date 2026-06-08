import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: users } = await supabase.from('portal_users').select('*').order('created_at', { ascending: false }).limit(100)
  return (
    <PortalLayout user={user}>
      <PageHeader title="Användare" description="Portalens användare. Första superadmin skapas manuellt i Supabase." />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Namn</th><th>E-post</th><th>Roll</th><th>Status</th><th>Skapad</th></tr></thead>
          <tbody>{(users ?? []).map((u: any) => <tr key={u.id}><td>{u.full_name || '—'}</td><td>{u.email}</td><td>{u.role}</td><td>{u.status}</td><td>{formatDate(u.created_at)}</td></tr>)}</tbody>
        </table>
      </div>
    </PortalLayout>
  )
}
