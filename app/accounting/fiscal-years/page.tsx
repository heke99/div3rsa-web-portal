import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { FiscalYearForm } from '@/components/accounting/AccountingActionForms'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function FiscalYearsPage() {
  const user = await requireUser(); const features = await getCustomerFeatures(user.customer_id); const enabled = featureEnabled(features, 'accounting'); const supabase = createAdminClient()
  const { data: years } = enabled && user.customer_id ? await supabase.from('accounting_fiscal_years').select('*').eq('payment_customer_id', user.customer_id).order('starts_on', { ascending: false }) : { data: [] }
  return <PortalLayout user={user}><PageHeader title="Räkenskapsår" eyebrow="Accounting" description="Skapa räkenskapsår och lås perioder när ni är klara." />{!enabled ? <AccountingLocked /> : <div className="space-y-5"><FiscalYearForm /><section className="card table-wrap"><table><thead><tr><th>Namn</th><th>Start</th><th>Slut</th><th>Status</th><th>Låst t.o.m.</th></tr></thead><tbody>{(years ?? []).map((year: any) => <tr key={year.id}><td className="font-bold">{year.name}</td><td>{year.starts_on}</td><td>{year.ends_on}</td><td>{year.status}</td><td>{year.locked_until || '—'}</td></tr>)}</tbody></table></section></div>}</PortalLayout>
}
