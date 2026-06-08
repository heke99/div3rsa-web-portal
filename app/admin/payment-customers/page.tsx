import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function PaymentCustomersPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: customers } = await supabase.from('payment_customers').select('*').order('created_at', { ascending: false }).limit(100)

  return (
    <PortalLayout user={user}>
      <PageHeader title="Kunder" eyebrow="Portal" description="Kunder som skapats från godkända ansökningar." />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Bolag</th><th>Kontakt</th><th>Status</th><th>Portal</th><th>Skapad</th><th></th></tr></thead>
          <tbody>
            {(customers ?? []).map((customer: any) => (
              <tr key={customer.id}>
                <td><div className="font-bold">{customer.company_name}</div><div className="text-sm text-muted">{customer.org_number}</div></td>
                <td><div>{customer.contact_name}</div><div className="text-sm text-muted">{customer.email}</div></td>
                <td><StatusBadge value={customer.status} /></td>
                <td><span className="text-sm text-muted">{customer.portal_status || '—'}</span></td>
                <td>{formatDate(customer.created_at)}</td>
                <td><Link className="font-bold text-brand" href={`/admin/payment-customers/${customer.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers?.length === 0 ? <div className="p-6 text-center text-muted">Inga kunder ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}
