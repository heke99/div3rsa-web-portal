import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InvoiceCustomersPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: customers } = user.customer_id
    ? await supabase.from('invoice_customers').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false })
    : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader title="Kunder" eyebrow="Fakturering" description="Spara mottagare som kan väljas när ni skapar fakturor." action={<Link href="/invoice-customers/new" className="btn btn-primary">Ny kund</Link>} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Namn</th><th>Kontakt</th><th>Adress</th><th>Villkor</th><th></th></tr></thead>
          <tbody>
            {(customers ?? []).map((customer: any) => (
              <tr key={customer.id}>
                <td><div className="font-bold">{customer.name}</div><div className="text-sm text-muted">{customer.organization_number || '—'}</div></td>
                <td><div>{customer.contact_person || '—'}</div><div className="text-sm text-muted">{customer.email}</div></td>
                <td><div>{customer.address_line_1 || '—'}</div><div className="text-sm text-muted">{[customer.postal_code, customer.city].filter(Boolean).join(' ') || '—'}</div></td>
                <td>{customer.default_payment_terms_days || 30} dagar</td>
                <td><Link className="font-bold text-brand" href={`/invoice-customers/${customer.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers?.length === 0 ? <div className="p-6 text-center text-muted">Inga sparade kunder ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}
