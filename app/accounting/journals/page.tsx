import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { InvoiceJournalForm, ManualJournalForm, PostJournalButton } from '@/components/accounting/AccountingActionForms'
import { AccountingLocked } from '@/components/accounting/AccountingLocked'

export const dynamic = 'force-dynamic'

export default async function JournalsPage() {
  const user = await requireUser(); const features = await getCustomerFeatures(user.customer_id); const enabled = featureEnabled(features, 'accounting'); const supabase = createAdminClient()
  const [years, entries, invoices] = enabled && user.customer_id ? await Promise.all([
    supabase.from('accounting_fiscal_years').select('*').eq('payment_customer_id', user.customer_id).order('starts_on', { ascending: false }),
    supabase.from('accounting_journal_entries').select('*').eq('payment_customer_id', user.customer_id).order('entry_date', { ascending: false }).limit(100),
    supabase.from('invoices').select('id,invoice_number,total_amount,currency,status,accounting_journal_entry_id').eq('payment_customer_id', user.customer_id).in('status', ['sent','paid']).is('accounting_journal_entry_id', null).order('created_at', { ascending: false }).limit(100),
  ]) : [{ data: [] }, { data: [] }, { data: [] }]
  return <PortalLayout user={user}><PageHeader title="Verifikationer" eyebrow="Accounting" description="Skapa utkast, kontrollera balans och bokför först när verifikationen är korrekt." />{!enabled ? <AccountingLocked /> : <div className="space-y-5"><InvoiceJournalForm invoices={invoices.data ?? []} fiscalYears={years.data ?? []} /><ManualJournalForm fiscalYears={years.data ?? []} /><section className="card table-wrap"><table><thead><tr><th>Datum</th><th>Serie</th><th>Nr</th><th>Beskrivning</th><th>Källa</th><th>Status</th><th></th></tr></thead><tbody>{(entries.data ?? []).map((entry: any) => <tr key={entry.id}><td>{entry.entry_date}</td><td>{entry.series_code}</td><td>{entry.voucher_number || 'Utkast'}</td><td>{entry.description}</td><td>{entry.source_type}</td><td>{entry.status}</td><td>{entry.status === 'draft' ? <PostJournalButton entryId={entry.id} /> : null}</td></tr>)}</tbody></table></section></div>}</PortalLayout>
}
