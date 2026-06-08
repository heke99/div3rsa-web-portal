import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function RecurringInvoicesPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: schedules } = user.customer_id
    ? await supabase
      .from('recurring_invoice_schedules')
      .select('*, invoice_customers(name,email), recurring_invoice_schedule_items(id)')
      .eq('payment_customer_id', user.customer_id)
      .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader
        title="Återkommande fakturor"
        eyebrow="Fakturering"
        description="Skapa månadsvisa, kvartalsvisa eller årliga fakturascheman. Första versionen skapar utkast, inte autoskick."
        action={<Link href="/recurring-invoices/new" className="btn btn-primary">Ny återkommande faktura</Link>}
      />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Schema</th><th>Kund</th><th>Frekvens</th><th>Nästa utkast</th><th>Status</th><th>Autoskick</th><th></th></tr></thead>
          <tbody>
            {(schedules ?? []).map((schedule: any) => (
              <tr key={schedule.id}>
                <td><div className="font-bold">{schedule.title}</div><div className="text-sm text-muted">{schedule.recurring_invoice_schedule_items?.length || 0} rader</div></td>
                <td><div>{schedule.invoice_customers?.name || '—'}</div><div className="text-sm text-muted">{schedule.invoice_customers?.email || '—'}</div></td>
                <td>{frequencyLabel(schedule.frequency)}</td>
                <td>{formatDate(schedule.next_run_date)}</td>
                <td><StatusBadge value={schedule.status} /></td>
                <td>{schedule.auto_send ? 'På' : 'Av'}</td>
                <td><Link className="font-bold text-brand" href={`/recurring-invoices/${schedule.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedules?.length === 0 ? <div className="p-6 text-center text-muted">Inga återkommande fakturor ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}

function frequencyLabel(value: string) {
  return value === 'quarterly' ? 'Kvartalsvis' : value === 'yearly' ? 'Årsvis' : value === 'custom' ? 'Anpassad' : 'Månadsvis'
}
