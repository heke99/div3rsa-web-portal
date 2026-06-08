import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarkInvoicePaidForm, SendInvoiceButton } from '@/components/invoices/InvoiceActions'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireUser } from '@/lib/auth/session'
import { buildInvoiceHtml } from '@/lib/invoices'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: invoice }, { data: customer }] = await Promise.all([
    user.customer_id ? supabase.from('invoices').select('*').eq('id', id).eq('payment_customer_id', user.customer_id).maybeSingle() : Promise.resolve({ data: null } as any),
    user.customer_id ? supabase.from('payment_customers').select('*').eq('id', user.customer_id).maybeSingle() : Promise.resolve({ data: null } as any),
  ])
  if (!invoice || !customer) notFound()

  const [{ data: recipient }, { data: items }, { data: events }, { data: emails }, { data: settings }] = await Promise.all([
    supabase.from('invoice_customers').select('*').eq('id', invoice.invoice_customer_id).eq('payment_customer_id', user.customer_id).maybeSingle(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('invoice_events').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    supabase.from('invoice_email_logs').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    supabase.from('invoice_settings').select('*').eq('payment_customer_id', user.customer_id).maybeSingle(),
  ])
  if (!recipient) notFound()
  const html = buildInvoiceHtml({ invoice, customer, recipient, items: items ?? [], settings })

  return (
    <PortalLayout user={user}>
      <PageHeader title={invoice.invoice_number || 'Fakturautkast'} eyebrow="Faktura" description="Visa, skicka och följ fakturahändelser." action={<Link href="/invoices" className="btn btn-secondary">Tillbaka</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-ink">Fakturadetaljer</h2>
                <p className="text-sm text-muted">{recipient.name} · {formatCurrency(invoice.total_amount, invoice.currency)}</p>
              </div>
              <div className="flex flex-wrap gap-2"><StatusBadge value={invoice.status} /><StatusBadge value={invoice.accounting_sync_status} /></div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Info label="Fakturadatum" value={formatDate(invoice.issue_date)} />
              <Info label="Förfallodatum" value={formatDate(invoice.due_date)} />
              <Info label="Källa" value={invoice.source || 'portal'} />
              <Info label="Exkl. moms" value={formatCurrency(invoice.subtotal_amount, invoice.currency)} />
              <Info label="Moms" value={formatCurrency(invoice.vat_amount, invoice.currency)} />
              <Info label="Total" value={formatCurrency(invoice.total_amount, invoice.currency)} />
            </div>
          </section>
          <section className="card p-5">
            <h2 className="text-xl font-black text-ink">PDF-ready faktura</h2>
            <iframe className="mt-4 h-[760px] w-full rounded-2xl border border-line bg-white" srcDoc={html} title="Faktura" />
          </section>
          <section className="card table-wrap">
            <table>
              <thead><tr><th>Händelse</th><th>Beskrivning</th><th>Datum</th></tr></thead>
              <tbody>{(events ?? []).map((event: any) => <tr key={event.id}><td>{event.event_type}</td><td>{event.description}</td><td>{formatDate(event.created_at)}</td></tr>)}</tbody>
            </table>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="card p-5"><SendInvoiceButton invoiceId={invoice.id} disabled={invoice.status === 'paid'} resent={Boolean(invoice.sent_at || invoice.invoice_number)} /></section>
          <MarkInvoicePaidForm invoiceId={invoice.id} totalAmount={Number(invoice.total_amount || 0)} />
          <section className="card p-5">
            <h2 className="text-lg font-black text-ink">Mail-logg</h2>
            <div className="mt-3 space-y-3">{(emails ?? []).length ? emails?.map((email: any) => <div key={email.id} className="rounded-2xl border border-line bg-soft p-3 text-sm"><div className="font-bold text-ink">{email.status}</div><div className="text-muted">{email.recipient}</div><div className="text-xs text-muted">{formatDate(email.created_at)}</div>{email.error_message ? <div className="mt-1 text-xs text-rose-700">{email.error_message}</div> : null}</div>) : <p className="text-sm text-muted">Inga mailhändelser ännu.</p>}</div>
          </section>
        </aside>
      </div>
    </PortalLayout>
  )
}

function Info({ label, value }: { label: string; value?: any }) { return <div><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 text-sm font-semibold text-ink">{value || '—'}</div></div> }
