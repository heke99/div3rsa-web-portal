import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export default async function PaymentApplicationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAdmin()
  const params = await searchParams
  const q = typeof params?.q === 'string' ? params.q.trim() : ''
  const status = typeof params?.status === 'string' ? params.status : ''
  const supabase = createAdminClient()

  let query = supabase
    .from('payment_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)
  if (q) query = query.or(`company_name.ilike.%${q}%,org_number.ilike.%${q}%,email.ilike.%${q}%`)

  const { data: applications } = await query

  return (
    <PortalLayout user={user}>
      <PageHeader title="Ansökningar" eyebrow="Företagsbetalningar & Bankgiro" description="Här ser du ansökningar som kommer från div3rsa.com." />
      <form className="card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="input" name="q" defaultValue={q} placeholder="Sök bolag, orgnummer eller e-post" />
        <select className="input" name="status" defaultValue={status}>
          <option value="">Alla statusar</option>
          <option value="new">Ny</option>
          <option value="under_review">Granskas</option>
          <option value="needs_more_info">Komplettering</option>
          <option value="qualified">Kvalificerad</option>
          <option value="approved">Godkänd</option>
          <option value="rejected">Avslagen</option>
        </select>
        <button className="btn btn-primary">Filtrera</button>
      </form>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Bolag</th><th>Kontakt</th><th>Volym</th><th>Status</th><th>Mail</th><th>Skapad</th><th></th></tr></thead>
          <tbody>
            {(applications ?? []).map((app: any) => (
              <tr key={app.id}>
                <td><div className="font-bold">{app.company_name}</div><div className="text-sm text-muted">{app.org_number}</div></td>
                <td><div>{app.contact_name}</div><div className="text-sm text-muted">{app.email}</div></td>
                <td><div>{app.monthly_volume_estimate || '—'}</div><div className="text-sm text-muted">{app.invoice_count_estimate || '—'} fakturor/mån</div></td>
                <td><StatusBadge value={app.status} /></td>
                <td><span className="text-sm text-muted">{app.admin_notification_status || '—'}</span></td>
                <td>{formatDate(app.created_at)}</td>
                <td><Link className="font-bold text-brand" href={`/admin/payment-applications/${app.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {applications?.length === 0 ? <div className="p-6 text-center text-muted">Inga ansökningar hittades.</div> : null}
      </div>
    </PortalLayout>
  )
}
