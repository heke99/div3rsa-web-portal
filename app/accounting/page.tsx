import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'
import { InitializeAccountingButton } from '@/components/accounting/AccountingActionForms'
import { accountingAppUrl, getAccountingDashboard } from '@/lib/accounting'
import { requireUser } from '@/lib/auth/session'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

export const dynamic = 'force-dynamic'

export default async function AccountingPage() {
  const user = await requireUser()
  const features = await getCustomerFeatures(user.customer_id)
  const enabled = featureEnabled(features, 'accounting')
  const dashboard = enabled && user.customer_id ? await getAccountingDashboard(user.customer_id) : null
  return (
    <PortalLayout user={user}>
      <PageHeader title="Accounting" eyebrow="Bokföringsapp" description={`Accounting körs som separat modul för ${accountingAppUrl}, men delar auth och tenantmodell med portalen.`} />
      {!enabled ? <AccountingLocked /> : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Konton" value={dashboard?.accountCount ?? 0} href="/accounting/accounts" />
            <Stat title="Räkenskapsår" value={dashboard?.fiscalYears.length ?? 0} href="/accounting/fiscal-years" />
            <Stat title="Senaste verifikationer" value={dashboard?.journals.length ?? 0} href="/accounting/journals" />
            <Stat title="Misslyckade syncjobb" value={dashboard?.failedSyncJobs ?? 0} href="/accounting/exports" />
          </div>
          <section className="card p-6">
            <h2 className="text-xl font-black text-ink">Kom igång</h2>
            <p className="mt-2 text-muted">Skapa grundkontoplan, momskoder och standardinställningar innan fakturor bokförs.</p>
            <div className="mt-4 flex flex-wrap gap-3"><InitializeAccountingButton /><Link className="btn btn-secondary" href="/accounting/settings">Inställningar</Link><Link className="btn btn-secondary" href="/accounting/docs">Guide</Link></div>
          </section>
          <section className="card table-wrap"><div className="p-5"><h2 className="text-xl font-black text-ink">Senaste verifikationer</h2></div><table><thead><tr><th>Datum</th><th>Serie</th><th>Nr</th><th>Beskrivning</th><th>Status</th></tr></thead><tbody>{(dashboard?.journals ?? []).map((entry: any) => <tr key={entry.id}><td>{entry.entry_date}</td><td>{entry.series_code}</td><td>{entry.voucher_number || 'Utkast'}</td><td>{entry.description}</td><td>{entry.status}</td></tr>)}</tbody></table></section>
        </div>
      )}
    </PortalLayout>
  )
}
function Stat({ title, value, href }: { title: string; value: number; href: string }) { return <Link href={href} className="card block p-5 hover:shadow-card"><div className="text-sm font-bold text-muted">{title}</div><div className="mt-3 text-3xl font-black text-ink">{value}</div></Link> }
