import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { AdminResendInvoiceButton } from '@/components/invoices/InvoiceActions'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireAdmin } from '@/lib/auth/session'
import { buildInvoiceHtml } from '@/lib/invoices'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const { data: invoice } = await supabase.from('invoices').select('*, payment_customers(*)').eq('id', id).maybeSingle()
  if (!invoice) notFound()
  const [{ data: recipient }, { data: items }, { data: events }, { data: emails }, { data: settings }] = await Promise.all([
    supabase.from('invoice_customers').select('*').eq('id', invoice.invoice_customer_id).maybeSingle(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('invoice_events').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    supabase.from('invoice_email_logs').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    supabase.from('invoice_settings').select('*').eq('payment_customer_id', invoice.payment_customer_id).maybeSingle(),
  ])
  if (!recipient) notFound()
  const html = buildInvoiceHtml({ invoice, customer: invoice.payment_customers, recipient, items: items ?? [], settings })

  return (
    <PortalLayout user={user}>
      <PageHeader title={invoice.invoice_number || 'Fakturautkast'} eyebrow="Admin · faktura" description={`${invoice.payment_customers?.company_name || 'Kund'} → ${recipient.name}`} action={<Link href="/admin/invoices" className="btn btn-secondary">Tillbaka</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap gap-2"><StatusBadge value={invoice.status} /><StatusBadge value={invoice.accounting_sync_status} /></div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Info label="Kundbolag" value={invoice.payment_customers?.company_name} />
              <Info label="Mottagare" value={recipient.name} />
              <Info label="Total" value={formatCurrency(invoice.total_amount, invoice.currency)} />
              <Info label="Fakturadatum" value={formatDate(invoice.issue_date)} />
              <Info label="Förfallodatum" value={formatDate(invoice.due_date)} />
              <Info label="Källa" value={invoice.source || 'portal'} />
            </div>
          </section>
          <section className="card p-5"><iframe className="h-[760px] w-full rounded-2xl border border-line bg-white" srcDoc={html} title="Faktura" /></section>
        </div>
        <aside className="space-y-5">
          <section className="card p-5"><h2 className="text-lg font-black text-ink">Mailåtgärder</h2><div className="mt-3"><AdminResendInvoiceButton invoiceId={invoice.id} /></div></section>
          <section className="card p-5"><h2 className="text-lg font-black text-ink">Händelser</h2><div className="mt-3 space-y-3">{(events ?? []).map((event: any) => <div key={event.id} className="rounded-2xl border border-line bg-soft p-3 text-sm"><div className="font-bold text-ink">{event.event_type}</div><div>{event.description}</div><div className="text-xs text-muted">{formatDate(event.created_at)}</div></div>)}</div></section>
          <section className="card p-5"><h2 className="text-lg font-black text-ink">Mail-logg</h2><div className="mt-3 space-y-3">{(emails ?? []).map((email: any) => <div key={email.id} className="rounded-2xl border border-line bg-soft p-3 text-sm"><div className="font-bold text-ink">{email.status}</div><div className="text-muted">{email.recipient}</div><div className="text-xs text-muted">{formatDate(email.created_at)}</div>{email.error_message ? <div className="mt-1 text-xs text-rose-700">{email.error_message}</div> : null}</div>)}</div></section>
        </aside>
      </div>
    </PortalLayout>
  )
}

function Info({ label, value }: { label: string; value?: any }) { return <div><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 text-sm font-semibold text-ink">{value || '—'}</div></div> }
