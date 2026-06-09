import { adminApproveAccountingConnectionFormAction } from '@/lib/actions/accounting'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminAccountingAccessPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: customers } = await supabase.from('payment_customers').select('id,company_name,email,status,company_features(feature_key,enabled),accounting_connections(status,app_url,last_sync_at,last_error)').order('created_at', { ascending: false }).limit(100)
  return <PortalLayout user={user}><PageHeader title="Accounting access" eyebrow="Admin" description="Aktivera accounting som separat appmodul på accounting.div3rsa.com." /><section className="card table-wrap"><table><thead><tr><th>Kund</th><th>Feature</th><th>Anslutning</th><th>App</th><th>Senaste fel</th><th></th></tr></thead><tbody>{(customers ?? []).map((customer: any) => { const features = customer.company_features ?? []; const accounting = features.find((f: any) => f.feature_key === 'accounting')?.enabled; const connection = (customer.accounting_connections ?? [])[0]; return <tr key={customer.id}><td><div className="font-bold">{customer.company_name}</div><div className="text-sm text-muted">{customer.email}</div></td><td>{accounting ? 'Accounting aktivt' : 'Ej aktiverat'}</td><td>{connection?.status || 'Saknas'}</td><td>{connection?.app_url || 'https://accounting.div3rsa.com'}</td><td>{connection?.last_error || '—'}</td><td><form action={adminApproveAccountingConnectionFormAction}><input type="hidden" name="customer_id" value={customer.id} /><button className="font-bold text-ink">Skapa/aktivera anslutning</button></form></td></tr> })}</tbody></table></section></PortalLayout>
}
