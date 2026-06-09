import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function VatPage() {
  const user = await requireUser(); const features = await getCustomerFeatures(user.customer_id); const enabled = featureEnabled(features, 'accounting'); const supabase = createAdminClient()
  const { data: vatCodes } = enabled && user.customer_id ? await supabase.from('accounting_vat_codes').select('*').eq('payment_customer_id', user.customer_id).order('code') : { data: [] }
  return <PortalLayout user={user}><PageHeader title="Moms" eyebrow="Accounting" description="Momskoder och standardkonton. Dessa styr förslag, men bokföring ska alltid kontrolleras innan postning." />{!enabled ? <AccountingLocked /> : <section className="card table-wrap"><table><thead><tr><th>Kod</th><th>Beskrivning</th><th>Sats</th><th>Utgående moms</th><th>Försäljning</th><th>Status</th></tr></thead><tbody>{(vatCodes ?? []).map((code: any) => <tr key={code.id}><td className="font-bold">{code.code}</td><td>{code.description}</td><td>{code.vat_rate}%</td><td>{code.output_vat_account || '—'}</td><td>{code.sales_account || '—'}</td><td>{code.is_active ? 'Aktiv' : 'Inaktiv'}</td></tr>)}</tbody></table></section>}</PortalLayout>
}
