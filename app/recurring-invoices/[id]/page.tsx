import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreateRecurringDraftForm, RecurringStatusForm } from '@/components/recurring-invoices/RecurringInvoiceActions'
import { RecurringInvoiceForm } from '@/components/recurring-invoices/RecurringInvoiceForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function RecurringInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: schedule }, { data: recipients }] = await Promise.all([
    user.customer_id ? supabase.from('recurring_invoice_schedules').select('*, invoice_customers(name,email)').eq('id', id).eq('payment_customer_id', user.customer_id).maybeSingle() : Promise.resolve({ data: null } as any),
    user.customer_id ? supabase.from('invoice_customers').select('*').eq('payment_customer_id', user.customer_id).order('name') : Promise.resolve({ data: [] } as any),
  ])
  if (!schedule) notFound()
  const [{ data: items }, { data: runs }] = await Promise.all([
    supabase.from('recurring_invoice_schedule_items').select('*').eq('schedule_id', id).order('sort_order'),
    supabase.from('recurring_invoice_runs').select('*, invoices(invoice_number,status,total_amount,currency)').eq('schedule_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <PortalLayout user={user}>
      <PageHeader title={schedule.title} eyebrow="Återkommande faktura" description="Redigera schema, skapa nästa fakturautkast och följ körningar." action={<Link href="/recurring-invoices" className="btn btn-secondary">Tillbaka</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-ink">Översikt</h2>
                <p className="text-sm text-muted">{schedule.invoice_customers?.name || 'Kund saknas'} · nästa utkast {formatDate(schedule.next_run_date)}</p>
              </div>
              <StatusBadge value={schedule.status} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Info label="Frekvens" value={frequencyLabel(schedule.frequency)} />
              <Info label="Autoskick" value={schedule.auto_send ? 'På' : 'Av'} />
              <Info label="Valuta" value={schedule.currency || 'SEK'} />
              <Info label="Villkor" value={`${schedule.payment_terms_days ?? 30} dagar`} />
            </div>
          </section>
          <RecurringInvoiceForm schedule={schedule} items={items ?? []} recipients={recipients ?? []} />
          <section className="card table-wrap">
            <table>
              <thead><tr><th>Kördatum</th><th>Status</th><th>Faktura</th><th>Fel</th></tr></thead>
              <tbody>
                {(runs ?? []).map((run: any) => (
                  <tr key={run.id}>
                    <td>{formatDate(run.generated_for_date || run.run_date)}</td>
                    <td><StatusBadge value={run.status} /></td>
                    <td>{run.invoice_id ? <Link href={`/invoices/${run.invoice_id}`} className="font-bold text-brand">{run.invoices?.invoice_number || 'Utkast'}</Link> : '—'}</td>
                    <td className="text-sm text-muted">{run.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {runs?.length === 0 ? <div className="p-6 text-center text-muted">Inga körningar ännu.</div> : null}
          </section>
        </div>
        <aside className="space-y-5">
          <CreateRecurringDraftForm scheduleId={schedule.id} nextRunDate={schedule.next_run_date} />
          <RecurringStatusForm scheduleId={schedule.id} currentStatus={schedule.status} />
        </aside>
      </div>
    </PortalLayout>
  )
}

function Info({ label, value }: { label: string; value?: any }) { return <div><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 text-sm font-semibold text-ink">{value || '—'}</div></div> }
function frequencyLabel(value: string) { return value === 'quarterly' ? 'Kvartalsvis' : value === 'yearly' ? 'Årsvis' : value === 'custom' ? 'Anpassad' : 'Månadsvis' }
