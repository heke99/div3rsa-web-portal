import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const user = await requireUser(); const features = await getCustomerFeatures(user.customer_id); const enabled = featureEnabled(features, 'accounting'); const supabase = createAdminClient()
  const { data: lines } = enabled && user.customer_id ? await supabase.from('accounting_journal_lines').select('account_number,debit_amount,credit_amount,accounting_journal_entries!inner(status,payment_customer_id)').eq('payment_customer_id', user.customer_id).eq('accounting_journal_entries.status', 'posted') : { data: [] }
  const balances = Object.values((lines ?? []).reduce((acc: Record<string, any>, line: any) => { const row = acc[line.account_number] ||= { account_number: line.account_number, debit: 0, credit: 0 }; row.debit += Number(line.debit_amount || 0); row.credit += Number(line.credit_amount || 0); return acc }, {})).sort((a: any,b: any) => a.account_number.localeCompare(b.account_number))
  return <PortalLayout user={user}><PageHeader title="Rapporter" eyebrow="Accounting" description="Första rapportvyn visar bokförda saldon per konto. Resultat- och balansrapport kan byggas ovanpå samma data." />{!enabled ? <AccountingLocked /> : <section className="card table-wrap"><table><thead><tr><th>Konto</th><th>Debet</th><th>Kredit</th><th>Netto</th></tr></thead><tbody>{balances.map((row: any) => <tr key={row.account_number}><td className="font-bold">{row.account_number}</td><td>{row.debit.toLocaleString('sv-SE')}</td><td>{row.credit.toLocaleString('sv-SE')}</td><td>{(row.debit - row.credit).toLocaleString('sv-SE')}</td></tr>)}</tbody></table></section>}</PortalLayout>
}
