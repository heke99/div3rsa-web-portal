import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function AdminInvoicesPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, payment_customers(company_name,email), invoice_customers(name,email)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <PortalLayout user={user}>
      <PageHeader title="Fakturor" eyebrow="Admin" description="Alla fakturor i portalen, inklusive mail- och accounting-status." />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Faktura</th><th>Kundbolag</th><th>Mottagare</th><th>Belopp</th><th>Status</th><th>Accounting</th><th>Skapad</th><th></th></tr></thead>
          <tbody>
            {(invoices ?? []).map((invoice: any) => (
              <tr key={invoice.id}>
                <td><div className="font-bold">{invoice.invoice_number || 'Utkast'}</div><div className="text-sm text-muted">{invoice.source || 'portal'}</div></td>
                <td><div>{invoice.payment_customers?.company_name || '—'}</div><div className="text-sm text-muted">{invoice.payment_customers?.email || '—'}</div></td>
                <td><div>{invoice.invoice_customers?.name || '—'}</div><div className="text-sm text-muted">{invoice.invoice_customers?.email || '—'}</div></td>
                <td>{formatCurrency(invoice.total_amount, invoice.currency)}</td>
                <td><StatusBadge value={invoice.status} /></td>
                <td><StatusBadge value={invoice.accounting_sync_status} /></td>
                <td>{formatDate(invoice.created_at)}</td>
                <td><Link className="font-bold text-brand" href={`/admin/invoices/${invoice.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices?.length === 0 ? <div className="p-6 text-center text-muted">Inga fakturor ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}
