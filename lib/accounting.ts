import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

export const accountingAppUrl = process.env.NEXT_PUBLIC_ACCOUNTING_APP_URL || 'https://accounting.div3rsa.com'

export const standardAccountingAccounts = [
  { account_number: '1510', account_name: 'Kundfordringar', account_class: 1, account_type: 'asset', normal_balance: 'debit', is_system_account: true },
  { account_number: '1930', account_name: 'Företagskonto/checkkonto/affärskonto', account_class: 1, account_type: 'asset', normal_balance: 'debit', is_system_account: true },
  { account_number: '2611', account_name: 'Utgående moms på försäljning inom Sverige, 25 %', account_class: 2, account_type: 'liability', normal_balance: 'credit', vat_code: 'UT25', is_system_account: true },
  { account_number: '2612', account_name: 'Utgående moms på försäljning inom Sverige, 12 %', account_class: 2, account_type: 'liability', normal_balance: 'credit', vat_code: 'UT12', is_system_account: true },
  { account_number: '2613', account_name: 'Utgående moms på försäljning inom Sverige, 6 %', account_class: 2, account_type: 'liability', normal_balance: 'credit', vat_code: 'UT06', is_system_account: true },
  { account_number: '3001', account_name: 'Försäljning inom Sverige, 25 % moms', account_class: 3, account_type: 'revenue', normal_balance: 'credit', vat_code: 'UT25', is_system_account: true },
  { account_number: '3002', account_name: 'Försäljning inom Sverige, 12 % moms', account_class: 3, account_type: 'revenue', normal_balance: 'credit', vat_code: 'UT12', is_system_account: true },
  { account_number: '3003', account_name: 'Försäljning inom Sverige, 6 % moms', account_class: 3, account_type: 'revenue', normal_balance: 'credit', vat_code: 'UT06', is_system_account: true },
  { account_number: '3044', account_name: 'Försäljning tjänster Sverige, momsfri', account_class: 3, account_type: 'revenue', normal_balance: 'credit', vat_code: 'MOMSFRI', is_system_account: true },
  { account_number: '3740', account_name: 'Öres- och kronutjämning', account_class: 3, account_type: 'revenue', normal_balance: 'credit', is_system_account: true },
  { account_number: '6350', account_name: 'Kundförluster', account_class: 6, account_type: 'expense', normal_balance: 'debit', is_system_account: true },
]

export const standardVatCodes = [
  { code: 'UT25', description: 'Utgående moms 25 %', vat_rate: 25, output_vat_account: '2611', sales_account: '3001' },
  { code: 'UT12', description: 'Utgående moms 12 %', vat_rate: 12, output_vat_account: '2612', sales_account: '3002' },
  { code: 'UT06', description: 'Utgående moms 6 %', vat_rate: 6, output_vat_account: '2613', sales_account: '3003' },
  { code: 'MOMSFRI', description: 'Momsfri försäljning', vat_rate: 0, sales_account: '3044' },
]

export async function requireAccountingFeature(customerId?: string | null) {
  if (!customerId) return false
  const features = await getCustomerFeatures(customerId)
  return featureEnabled(features, 'accounting')
}

export async function ensureAccountingDefaults(paymentCustomerId: string) {
  const supabase = createAdminClient()
  await supabase.from('accounting_settings').upsert({ payment_customer_id: paymentCustomerId }, { onConflict: 'payment_customer_id' })

  for (const account of standardAccountingAccounts) {
    await supabase.from('accounting_accounts').upsert({ payment_customer_id: paymentCustomerId, ...account }, { onConflict: 'payment_customer_id,account_number' })
  }
  for (const vatCode of standardVatCodes) {
    await supabase.from('accounting_vat_codes').upsert({ payment_customer_id: paymentCustomerId, ...vatCode }, { onConflict: 'payment_customer_id,code' })
  }
}

export async function getAccountingDashboard(paymentCustomerId: string) {
  const supabase = createAdminClient()
  const [settings, accounts, years, journals, exports, failedJobs] = await Promise.all([
    supabase.from('accounting_settings').select('*').eq('payment_customer_id', paymentCustomerId).maybeSingle(),
    supabase.from('accounting_accounts').select('*', { count: 'exact', head: true }).eq('payment_customer_id', paymentCustomerId),
    supabase.from('accounting_fiscal_years').select('*').eq('payment_customer_id', paymentCustomerId).order('starts_on', { ascending: false }).limit(5),
    supabase.from('accounting_journal_entries').select('*').eq('payment_customer_id', paymentCustomerId).order('entry_date', { ascending: false }).limit(10),
    supabase.from('accounting_exports').select('*').eq('payment_customer_id', paymentCustomerId).order('created_at', { ascending: false }).limit(5),
    supabase.from('accounting_sync_jobs').select('*', { count: 'exact', head: true }).eq('payment_customer_id', paymentCustomerId).eq('status', 'failed'),
  ])
  return { settings: settings.data, accountCount: accounts.count ?? 0, fiscalYears: years.data ?? [], journals: journals.data ?? [], exports: exports.data ?? [], failedSyncJobs: failedJobs.count ?? 0 }
}

export function buildSieContent(input: { customer: any; journals: any[]; linesByEntry: Record<string, any[]>; periodStart?: string | null; periodEnd?: string | null }) {
  const companyName = String(input.customer?.company_name || 'Div3rsa kund').replace(/"/g, '')
  const org = String(input.customer?.org_number || '').replace(/\D/g, '')
  const rows: string[] = []
  rows.push('#FLAGGA 0')
  rows.push('#PROGRAM "Div3rsa Accounting"')
  rows.push(`#FNAMN "${companyName}"`)
  if (org) rows.push(`#ORGNR ${org}`)
  if (input.periodStart && input.periodEnd) rows.push(`#RAR 0 ${input.periodStart.replace(/-/g, '')} ${input.periodEnd.replace(/-/g, '')}`)
  for (const journal of input.journals) {
    const date = String(journal.entry_date || '').replace(/-/g, '')
    const series = journal.series_code || 'A'
    const voucher = journal.voucher_number || 0
    rows.push(`#VER ${series} ${voucher} ${date} "${String(journal.description || '').replace(/"/g, '')}"`)
    rows.push('{')
    for (const line of input.linesByEntry[journal.id] || []) {
      const amount = Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
      rows.push(`#TRANS ${line.account_number} {} ${amount.toFixed(2)} "${String(line.line_description || journal.description || '').replace(/"/g, '')}"`)
    }
    rows.push('}')
  }
  return rows.join('\n')
}
