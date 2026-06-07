import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InviteForm } from '@/components/admin/InviteForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils/format'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: customer }, { data: pricing }, { data: invites }, { data: audits }] = await Promise.all([
    supabase.from('payment_customers').select('*').eq('id', id).maybeSingle(),
    supabase.from('payment_customer_pricing').select('*').eq('customer_id', id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('portal_invites').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_logs').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(10),
  ])
  if (!customer) notFound()

  return (
    <PortalLayout user={user}>
      <PageHeader title={customer.company_name} eyebrow="Kund" description="Kundkort, prisprofil och portalaccess." action={<Link href="/admin/payment-customers" className="btn btn-secondary">Tillbaka</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-ink">Kunduppgifter</h2>
              <StatusBadge value={customer.status} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info label="Orgnummer" value={customer.org_number} />
              <Info label="Kontaktperson" value={customer.contact_name} />
              <Info label="E-post" value={customer.email} />
              <Info label="Telefon" value={customer.phone} />
              <Info label="Partnerstatus" value={customer.partner_status} />
              <Info label="Portalstatus" value={customer.portal_status} />
            </div>
          </section>
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-ink">Prisprofil</h2>
              <Link className="btn btn-primary" href={`/admin/payment-customers/${id}/pricing`}>{pricing ? 'Ändra pris' : 'Sätt pris'}</Link>
            </div>
            {pricing ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Info label="Startavgift" value={formatCurrency(pricing.setup_fee, pricing.currency)} />
                <Info label="Månadsavgift" value={formatCurrency(pricing.monthly_fee, pricing.currency)} />
                <Info label="Pris per faktura" value={formatCurrency(pricing.fee_per_invoice, pricing.currency)} />
                <Info label="Procent per faktura" value={formatPercent(pricing.percentage_fee_per_invoice)} />
                <Info label="Minimiavgift" value={formatCurrency(pricing.minimum_monthly_fee, pricing.currency)} />
                <Info label="Giltig från" value={pricing.valid_from} />
              </div>
            ) : <p className="mt-4 text-muted">Ingen prisprofil är satt ännu.</p>}
          </section>
        </div>
        <aside className="space-y-5">
          <InviteForm customerId={id} />
          <List title="Senaste inbjudningar" items={invites ?? []} empty="Inga inbjudningar ännu." />
          <List title="Audit" items={audits ?? []} empty="Inga audit events ännu." />
        </aside>
      </div>
    </PortalLayout>
  )
}

function Info({ label, value }: { label: string; value?: any }) { return <div><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 text-sm font-semibold text-ink">{value || '—'}</div></div> }
function List({ title, items, empty }: { title: string; items: any[]; empty: string }) { return <section className="card p-5"><h2 className="text-lg font-black text-ink">{title}</h2><div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="rounded-2xl border border-line bg-soft p-3 text-sm"><div className="font-semibold text-ink">{item.action || item.email || item.role || 'Event'}</div><div className="mt-1 text-xs text-muted">{formatDate(item.created_at)}</div></div>) : <p className="text-sm text-muted">{empty}</p>}</div></section> }
