import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: customer } = user.customer_id ? await supabase.from('payment_customers').select('*').eq('id', user.customer_id).maybeSingle() : { data: null }

  return (
    <PortalLayout user={user}>
      <PageHeader title="Välkommen till Div3rsa Portal" description="Här följer du onboarding, status och nästa steg för företagsbetalningar och bankgiroflöde." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Företagsbetalningar" value={customer?.status === 'active' ? 'Aktiv' : 'Under uppsättning'} />
        <StatusCard title="Bankgirobaserat flöde" value={customer?.partner_status === 'active' ? 'Aktiv' : 'Under uppsättning'} />
        <StatusCard title="Fakturaportal" value={customer?.portal_status === 'active' ? 'Aktiv' : 'Under uppsättning'} />
      </div>
      <div className="card mt-6 p-6">
        <h2 className="text-xl font-black text-ink">Nästa steg</h2>
        <p className="mt-2 max-w-2xl text-muted">Div3rsa går igenom ert ärende och uppdaterar status här i portalen. Kontakta support om något saknas eller behöver ändras.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/onboarding" className="btn btn-primary">Visa onboarding</Link>
          <Link href="/support" className="btn btn-secondary">Kontakta support</Link>
        </div>
      </div>
    </PortalLayout>
  )
}

function StatusCard({ title, value }: { title: string; value: string }) { return <div className="card p-5"><div className="text-sm font-bold text-muted">{title}</div><div className="mt-3 text-2xl font-black text-ink">{value}</div></div> }
