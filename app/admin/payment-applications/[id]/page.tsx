import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ApplicationNoteForm, ApplicationStatusForm } from '@/components/admin/ApplicationActions'
import { createCustomerFromApplicationAction } from '@/lib/actions/applications'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: app }, { data: notes }, { data: events }, { data: emails }, { data: customer }] = await Promise.all([
    supabase.from('payment_applications').select('*').eq('id', id).maybeSingle(),
    supabase.from('payment_application_notes').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    supabase.from('payment_application_events').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    supabase.from('email_logs').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    supabase.from('payment_customers').select('id,status').eq('application_id', id).maybeSingle(),
  ])

  if (!app) notFound()

  return (
    <PortalLayout user={user}>
      <PageHeader
        title={app.company_name || 'Ansökan'}
        eyebrow="Ansökan"
        description="Granska uppgifterna, ändra status och skapa kund när ansökan är redo."
        action={<Link href="/admin/payment-applications" className="btn btn-secondary">Tillbaka</Link>}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-ink">Översikt</h2>
              <StatusBadge value={app.status} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info label="Organisationsnummer" value={app.org_number} />
              <Info label="Kontaktperson" value={app.contact_name} />
              <Info label="E-post" value={app.email} />
              <Info label="Telefon" value={app.phone} />
              <Info label="Bransch" value={app.industry} />
              <Info label="Hemsida" value={app.website} />
              <Info label="Svenskt företagskonto" value={boolText(app.has_swedish_business_account)} />
              <Info label="Bankgiro idag" value={boolText(app.has_bankgiro)} />
              <Info label="Nekad banktjänst" value={boolText(app.was_denied_bank_services)} />
              <Info label="Skapad" value={formatDate(app.created_at)} />
            </div>
            <div className="mt-5">
              <Info label="Verksamhet" value={app.business_description} />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-black text-ink">Betalningsbehov</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info label="Kundtyp" value={app.customer_type} />
              <Info label="Månadsvolym" value={app.monthly_volume_estimate} />
              <Info label="Fakturor/månad" value={app.invoice_count_estimate} />
              <Info label="Genomsnittligt fakturabelopp" value={app.average_invoice_amount} />
              <Info label="Fakturering" value={boolText(app.needs_invoicing)} />
              <Info label="Kundinbetalningar" value={boolText(app.needs_customer_payments)} />
              <Info label="Bankgiroflöde" value={boolText(app.needs_bankgiro_flow)} />
              <Info label="Fakturaköp/förskott" value={boolText(app.needs_invoice_financing)} />
              <Info label="API/integration" value={boolText(app.needs_api)} />
              <Info label="Befintligt fakturasystem" value={app.current_invoice_system} />
              <Info label="Tidsplan" value={app.urgency} />
            </div>
            {app.other_comment ? <div className="mt-5"><Info label="Övrigt" value={app.other_comment} /></div> : null}
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-black text-ink">Samtycken</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Info label="Får kontakta kund" value={boolText(app.consent_contact)} />
              <Info label="Får vidarebefordra uppgifter" value={boolText(app.consent_partner_forwarding)} />
            </div>
          </section>

          {customer?.id ? (
            <section className="card p-5">
              <h2 className="text-xl font-black text-ink">Kund skapad</h2>
              <p className="mt-2 text-muted">Den här ansökan är kopplad till ett kundkort.</p>
              <Link className="btn btn-primary mt-4" href={`/admin/payment-customers/${customer.id}`}>Öppna kundkort</Link>
            </section>
          ) : (
            <form action={createCustomerFromApplicationAction} className="card p-5">
              <input type="hidden" name="application_id" value={app.id} />
              <h2 className="text-xl font-black text-ink">Skapa kund</h2>
              <p className="mt-2 text-muted">När ansökan är redo kan du skapa kundkort, sätta pris och därefter skicka portalinbjudan.</p>
              <button className="btn btn-primary mt-4">Skapa kund från ansökan</button>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <ApplicationStatusForm applicationId={app.id} currentStatus={app.status} />
          <ApplicationNoteForm applicationId={app.id} />
          <Activity title="Interna anteckningar" items={notes ?? []} empty="Inga anteckningar ännu." field="note" />
          <Activity title="Eventlogg" items={events ?? []} empty="Inga events ännu." field="description" />
          <Activity title="Email logs" items={emails ?? []} empty="Inga mail loggade." field="subject" statusField="status" />
        </aside>
      </div>
    </PortalLayout>
  )
}

function Info({ label, value }: { label: string; value?: any }) {
  return <div><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 text-sm font-semibold text-ink">{value || '—'}</div></div>
}
function boolText(value: any) { return value === true ? 'Ja' : value === false ? 'Nej' : '—' }
function Activity({ title, items, empty, field, statusField }: { title: string; items: any[]; empty: string; field: string; statusField?: string }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-line bg-soft p-3 text-sm">
            <div className="font-semibold text-ink">{item[field] || '—'}</div>
            {statusField ? <div className="mt-1 text-muted">Status: {item[statusField]}</div> : null}
            <div className="mt-1 text-xs text-muted">{formatDate(item.created_at)}</div>
          </div>
        )) : <p className="text-sm text-muted">{empty}</p>}
      </div>
    </section>
  )
}
