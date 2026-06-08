import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: invoices } = user.customer_id
    ? await supabase.from('invoices').select('*, invoice_customers(name,email)').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(100)
    : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader title="Skickade fakturor" eyebrow="Fakturering" description="Se fakturor, status, betalningar och bokföringsstatus." action={<Link href="/invoices/new" className="btn btn-primary">Ny faktura</Link>} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Faktura</th><th>Kund</th><th>Datum</th><th>Belopp</th><th>Status</th><th>Accounting</th><th>Källa</th><th></th></tr></thead>
          <tbody>
            {(invoices ?? []).map((invoice: any) => (
              <tr key={invoice.id}>
                <td><div className="font-bold">{invoice.invoice_number || 'Utkast'}</div><div className="text-sm text-muted">Förfall: {formatDate(invoice.due_date)}</div></td>
                <td><div>{invoice.invoice_customers?.name || '—'}</div><div className="text-sm text-muted">{invoice.invoice_customers?.email || '—'}</div></td>
                <td>{formatDate(invoice.issue_date)}</td>
                <td>{formatCurrency(invoice.total_amount, invoice.currency)}</td>
                <td><StatusBadge value={invoice.status} /></td>
                <td><StatusBadge value={invoice.accounting_sync_status} /></td>
                <td><span className="text-sm text-muted">{invoice.source || 'portal'}</span></td>
                <td><Link className="font-bold text-brand" href={`/invoices/${invoice.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices?.length === 0 ? <div className="p-6 text-center text-muted">Inga fakturor ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}
