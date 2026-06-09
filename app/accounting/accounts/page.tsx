import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { AccountForm, InitializeAccountingButton } from '@/components/accounting/AccountingActionForms'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function AccountingAccountsPage() {
  const user = await requireUser()
  const features = await getCustomerFeatures(user.customer_id)
  const enabled = featureEnabled(features, 'accounting')
  const supabase = createAdminClient()
  const { data: accounts } = enabled && user.customer_id ? await supabase.from('accounting_accounts').select('*').eq('payment_customer_id', user.customer_id).order('account_number') : { data: [] }
  return <PortalLayout user={user}><PageHeader title="Kontoplan" eyebrow="Accounting" description="BAS-inspirerad kontoplan per kundbolag. Ändra konton varsamt och behåll spårbarhet." />{!enabled ? <AccountingLocked /> : <div className="space-y-5"><InitializeAccountingButton /><AccountForm /><section className="card table-wrap"><table><thead><tr><th>Konto</th><th>Namn</th><th>Typ</th><th>Normal</th><th>Moms</th><th>Status</th></tr></thead><tbody>{(accounts ?? []).map((account: any) => <tr key={account.id}><td className="font-bold">{account.account_number}</td><td>{account.account_name}</td><td>{account.account_type}</td><td>{account.normal_balance}</td><td>{account.vat_code || '—'}</td><td>{account.is_active ? 'Aktiv' : 'Inaktiv'}</td></tr>)}</tbody></table></section></div>}</PortalLayout>
}
