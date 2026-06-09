import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { AccountingExportForm } from '@/components/accounting/AccountingActionForms'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function ExportsPage() {
  const user = await requireUser(); const features = await getCustomerFeatures(user.customer_id); const enabled = featureEnabled(features, 'accounting'); const supabase = createAdminClient()
  const { data: exports } = enabled && user.customer_id ? await supabase.from('accounting_exports').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(20) : { data: [] }
  return <PortalLayout user={user}><PageHeader title="Exporter" eyebrow="Accounting" description="SIE/CSV-export foundation. Kontrollera alltid exporten innan den används i bokföringsprogram." />{!enabled ? <AccountingLocked /> : <div className="space-y-5"><AccountingExportForm /><section className="card table-wrap"><table><thead><tr><th>Fil</th><th>Typ</th><th>Period</th><th>Status</th><th>Skapad</th></tr></thead><tbody>{(exports ?? []).map((exp: any) => <tr key={exp.id}><td><details><summary className="cursor-pointer font-bold">{exp.file_name || exp.id}</summary><pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-white">{exp.generated_content || ''}</pre></details></td><td>{exp.export_type}</td><td>{exp.period_start || '—'} – {exp.period_end || '—'}</td><td>{exp.status}</td><td>{exp.created_at ? new Date(exp.created_at).toLocaleString('sv-SE') : '—'}</td></tr>)}</tbody></table></section></div>}</PortalLayout>
}
