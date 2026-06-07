import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function CompanySettingsPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: customer } = user.customer_id ? await supabase.from('payment_customers').select('*').eq('id', user.customer_id).maybeSingle() : { data: null }
  return (
    <PortalLayout user={user}>
      <PageHeader title="Företagsuppgifter" description="Grunduppgifter för ert konto. Kontakta support om något ska ändras." />
      <section className="card p-6 grid gap-4 md:grid-cols-2">
        <Info label="Företag" value={customer?.company_name} />
        <Info label="Orgnummer" value={customer?.org_number} />
        <Info label="Kontaktperson" value={customer?.contact_name} />
        <Info label="E-post" value={customer?.email} />
        <Info label="Telefon" value={customer?.phone} />
        <Info label="Status" value={customer?.status} />
      </section>
    </PortalLayout>
  )
}
function Info({ label, value }: { label: string; value?: string | null }) { return <div><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-1 font-bold text-ink">{value || '—'}</div></div> }
