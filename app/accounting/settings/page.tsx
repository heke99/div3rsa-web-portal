import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { AccountingSettingsForm } from '@/components/accounting/AccountingActionForms'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function AccountingSettingsPage() {
  const user = await requireUser(); const features = await getCustomerFeatures(user.customer_id); const enabled = featureEnabled(features, 'accounting'); const supabase = createAdminClient()
  const { data: settings } = enabled && user.customer_id ? await supabase.from('accounting_settings').select('*').eq('payment_customer_id', user.customer_id).maybeSingle() : { data: null }
  return <PortalLayout user={user}><PageHeader title="Inställningar" eyebrow="Accounting" description="Styr standardkonton, bokföringsmetod och låsning för accounting-modulen." />{!enabled ? <AccountingLocked /> : <AccountingSettingsForm settings={settings} />}</PortalLayout>
}
