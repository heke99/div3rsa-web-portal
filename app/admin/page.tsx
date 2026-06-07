import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminDashboardPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const [{ count: applications }, { count: customers }, { count: openTickets }] = await Promise.all([
    supabase.from('payment_applications').select('*', { count: 'exact', head: true }),
    supabase.from('payment_customers').select('*', { count: 'exact', head: true }),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
  ])

  return (
    <PortalLayout user={user}>
      <PageHeader title="Adminöversikt" eyebrow="Div3rsa" description="Hantera ansökningar, kunder, prissättning och support från ett ställe." />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Ansökningar" value={applications ?? 0} href="/admin/payment-applications" />
        <Stat title="Kunder" value={customers ?? 0} href="/admin/payment-customers" />
        <Stat title="Öppna ärenden" value={openTickets ?? 0} href="/admin/support" />
      </div>
      <div className="card mt-6 p-6">
        <h2 className="text-xl font-black text-ink">Nästa steg</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link className="btn btn-secondary" href="/admin/payment-applications">Granska ansökningar</Link>
          <Link className="btn btn-secondary" href="/admin/payment-customers">Hantera kunder</Link>
          <Link className="btn btn-secondary" href="/admin/audit-logs">Visa audit logs</Link>
        </div>
      </div>
    </PortalLayout>
  )
}

function Stat({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="card block p-6 hover:shadow-card">
      <div className="text-sm font-bold text-muted">{title}</div>
      <div className="mt-3 text-4xl font-black text-ink">{value}</div>
    </Link>
  )
}
