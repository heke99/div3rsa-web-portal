import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

export default async function PricingPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: pricing } = user.customer_id ? await supabase.from('payment_customer_pricing').select('*').eq('customer_id', user.customer_id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null }
  return (
    <PortalLayout user={user}>
      <PageHeader title="Pris & avtal" description="Här visas aktuell prisprofil för ert konto. Kontakta Div3rsa om något behöver ändras." />
      <section className="card p-6">
        {pricing ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Info label="Startavgift" value={formatCurrency(pricing.setup_fee, pricing.currency)} />
          <Info label="Månadsavgift" value={formatCurrency(pricing.monthly_fee, pricing.currency)} />
          <Info label="Pris per faktura" value={formatCurrency(pricing.fee_per_invoice, pricing.currency)} />
          <Info label="Procent per faktura" value={formatPercent(pricing.percentage_fee_per_invoice)} />
          <Info label="Minimiavgift" value={formatCurrency(pricing.minimum_monthly_fee, pricing.currency)} />
          <Info label="API-avgift" value={formatCurrency(pricing.api_monthly_fee, pricing.currency)} />
          <Info label="Extra användare" value={formatCurrency(pricing.extra_user_fee, pricing.currency)} />
          <Info label="Supportavgift" value={formatCurrency(pricing.support_fee, pricing.currency)} />
          <Info label="Moms" value={formatPercent(pricing.vat_rate)} />
          <Info label="Faktureringsintervall" value={pricing.billing_interval} />
          <Info label="Giltig från" value={pricing.valid_from} />
        </div> : <p className="text-muted">Prisprofil är inte satt ännu.</p>}
      </section>
    </PortalLayout>
  )
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-line bg-soft p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div><div className="mt-2 text-lg font-black text-ink">{value}</div></div> }
