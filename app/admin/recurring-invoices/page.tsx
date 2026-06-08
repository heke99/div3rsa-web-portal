import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function AdminRecurringInvoicesPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: schedules } = await supabase
    .from('recurring_invoice_schedules')
    .select('*, payment_customers(company_name), invoice_customers(name,email), recurring_invoice_runs(id,status)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <PortalLayout user={user}>
      <PageHeader title="Återkommande fakturor" eyebrow="Admin" description="Översikt över kundernas återkommande fakturascheman och körningar." />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Schema</th><th>Kundbolag</th><th>Mottagare</th><th>Frekvens</th><th>Nästa utkast</th><th>Status</th><th>Körningar</th></tr></thead>
          <tbody>
            {(schedules ?? []).map((schedule: any) => (
              <tr key={schedule.id}>
                <td><div className="font-bold">{schedule.title}</div><div className="text-sm text-muted">Autoskick: {schedule.auto_send ? 'på' : 'av'}</div></td>
                <td>{schedule.payment_customers?.company_name || '—'}</td>
                <td><div>{schedule.invoice_customers?.name || '—'}</div><div className="text-sm text-muted">{schedule.invoice_customers?.email || '—'}</div></td>
                <td>{frequencyLabel(schedule.frequency)}</td>
                <td>{formatDate(schedule.next_run_date)}</td>
                <td><StatusBadge value={schedule.status} /></td>
                <td>{schedule.recurring_invoice_runs?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedules?.length === 0 ? <div className="p-6 text-center text-muted">Inga återkommande fakturor ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}

function frequencyLabel(value: string) { return value === 'quarterly' ? 'Kvartalsvis' : value === 'yearly' ? 'Årsvis' : value === 'custom' ? 'Anpassad' : 'Månadsvis' }
