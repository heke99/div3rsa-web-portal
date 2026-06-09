'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireUser } from '@/lib/auth/session'
import { buildSieContent, ensureAccountingDefaults, requireAccountingFeature } from '@/lib/accounting'
import type { ActionState } from '@/lib/actions/applications'

function str(formData: FormData, key: string) { return String(formData.get(key) || '').trim() }
function num(value: FormDataEntryValue | null, fallback = 0) { const parsed = Number(String(value || '').replace(',', '.')); return Number.isFinite(parsed) ? parsed : fallback }

async function requireAccountingContext() {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  const enabled = await requireAccountingFeature(user.customer_id)
  if (!enabled) return { ok: false as const, user, customerId: user.customer_id, message: 'Accounting kräver aktivering av Div3rsa.' }
  return { ok: true as const, user, customerId: user.customer_id }
}

export async function initializeAccountingAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  await ensureAccountingDefaults(ctx.customerId)
  revalidatePath('/accounting')
  revalidatePath('/accounting/accounts')
  return { ok: true, message: 'Accounting-grunden skapades.' }
}

export async function saveAccountingSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const supabase = createAdminClient()
  const payload = {
    payment_customer_id: ctx.customerId,
    accounting_method: str(formData, 'accounting_method') || 'invoice_method',
    default_receivables_account: str(formData, 'default_receivables_account') || '1510',
    default_bank_account: str(formData, 'default_bank_account') || '1930',
    default_revenue_account: str(formData, 'default_revenue_account') || '3001',
    default_output_vat_account: str(formData, 'default_output_vat_account') || '2611',
    default_customer_loss_account: str(formData, 'default_customer_loss_account') || '6350',
    journal_series_invoice: str(formData, 'journal_series_invoice') || 'F',
    journal_series_payment: str(formData, 'journal_series_payment') || 'B',
    locked_until: str(formData, 'locked_until') || null,
    notes: str(formData, 'notes') || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('accounting_settings').upsert(payload, { onConflict: 'payment_customer_id' })
  if (error) return { ok: false, message: 'Kunde inte spara accounting-inställningar.' }
  revalidatePath('/accounting/settings')
  return { ok: true, message: 'Accounting-inställningar sparades.' }
}

export async function createFiscalYearAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const startsOn = str(formData, 'starts_on')
  const endsOn = str(formData, 'ends_on')
  if (!startsOn || !endsOn) return { ok: false, message: 'Ange start- och slutdatum.' }
  const name = str(formData, 'name') || `${startsOn} – ${endsOn}`
  const supabase = createAdminClient()
  const { error } = await supabase.from('accounting_fiscal_years').insert({ payment_customer_id: ctx.customerId, name, starts_on: startsOn, ends_on: endsOn, created_by: ctx.user.id })
  if (error) return { ok: false, message: 'Kunde inte skapa räkenskapsår.' }
  revalidatePath('/accounting/fiscal-years')
  return { ok: true, message: 'Räkenskapsår skapades.' }
}

export async function saveAccountingAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const accountNumber = str(formData, 'account_number')
  const accountName = str(formData, 'account_name')
  if (!accountNumber || !accountName) return { ok: false, message: 'Ange kontonummer och kontonamn.' }
  const accountClass = Number(accountNumber.slice(0, 1)) || num(formData.get('account_class'), 1)
  const payload = {
    payment_customer_id: ctx.customerId,
    account_number: accountNumber,
    account_name: accountName,
    account_class: accountClass,
    account_type: str(formData, 'account_type') || 'asset',
    normal_balance: str(formData, 'normal_balance') || 'debit',
    vat_code: str(formData, 'vat_code') || null,
    is_active: formData.get('is_active') !== 'off',
    updated_at: new Date().toISOString(),
  }
  const supabase = createAdminClient()
  const { error } = await supabase.from('accounting_accounts').upsert(payload, { onConflict: 'payment_customer_id,account_number' })
  if (error) return { ok: false, message: 'Kunde inte spara konto.' }
  revalidatePath('/accounting/accounts')
  return { ok: true, message: 'Konto sparades.' }
}

async function nextVoucherNumber(customerId: string, fiscalYearId: string | null, seriesCode: string) {
  const supabase = createAdminClient()
  const { data: series } = await supabase.from('accounting_journal_series').select('*').eq('payment_customer_id', customerId).eq('fiscal_year_id', fiscalYearId).eq('series_code', seriesCode).maybeSingle()
  if (series?.id) {
    const next = Number(series.next_voucher_number || 1)
    await supabase.from('accounting_journal_series').update({ next_voucher_number: next + 1, updated_at: new Date().toISOString() }).eq('id', series.id)
    return next
  }
  await supabase.from('accounting_journal_series').insert({ payment_customer_id: customerId, fiscal_year_id: fiscalYearId, series_code: seriesCode, next_voucher_number: 2 })
  return 1
}

export async function createManualJournalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const description = str(formData, 'description')
  const entryDate = str(formData, 'entry_date') || new Date().toISOString().slice(0, 10)
  const fiscalYearId = str(formData, 'fiscal_year_id') || null
  const seriesCode = str(formData, 'series_code') || 'A'
  const lines = []
  for (let i = 0; i < 8; i += 1) {
    const account = str(formData, `line_account_${i}`)
    const debit = num(formData.get(`line_debit_${i}`), 0)
    const credit = num(formData.get(`line_credit_${i}`), 0)
    const lineDescription = str(formData, `line_description_${i}`) || description
    if (account && (debit > 0 || credit > 0)) lines.push({ account_number: account, debit_amount: debit, credit_amount: credit, line_description: lineDescription, sort_order: i })
  }
  const debitSum = lines.reduce((s, l) => s + l.debit_amount, 0)
  const creditSum = lines.reduce((s, l) => s + l.credit_amount, 0)
  if (!description || lines.length < 2) return { ok: false, message: 'Ange beskrivning och minst två rader.' }
  if (Math.round(debitSum * 100) !== Math.round(creditSum * 100)) return { ok: false, message: 'Debet och kredit måste balansera.' }

  const supabase = createAdminClient()
  const { data: entry, error } = await supabase.from('accounting_journal_entries').insert({
    payment_customer_id: ctx.customerId,
    fiscal_year_id: fiscalYearId,
    series_code: seriesCode,
    entry_date: entryDate,
    description,
    source_type: 'manual',
    status: 'draft',
    created_by: ctx.user.id,
  }).select('id').single()
  if (error || !entry) return { ok: false, message: 'Kunde inte skapa verifikation.' }
  await supabase.from('accounting_journal_lines').insert(lines.map((line) => ({ ...line, payment_customer_id: ctx.customerId, journal_entry_id: entry.id })))
  revalidatePath('/accounting/journals')
  return { ok: true, message: 'Verifikation skapades som utkast.' }
}

export async function postJournalEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const id = str(formData, 'journal_entry_id')
  const supabase = createAdminClient()
  const [{ data: entry }, { data: lines }] = await Promise.all([
    supabase.from('accounting_journal_entries').select('*').eq('id', id).eq('payment_customer_id', ctx.customerId).maybeSingle(),
    supabase.from('accounting_journal_lines').select('*').eq('journal_entry_id', id),
  ])
  if (!entry || entry.status !== 'draft') return { ok: false, message: 'Endast utkast kan bokföras.' }
  const debit = (lines ?? []).reduce((s: number, l: any) => s + Number(l.debit_amount || 0), 0)
  const credit = (lines ?? []).reduce((s: number, l: any) => s + Number(l.credit_amount || 0), 0)
  if (!lines?.length || Math.round(debit * 100) !== Math.round(credit * 100)) return { ok: false, message: 'Verifikationen balanserar inte.' }
  const voucherNumber = entry.voucher_number || await nextVoucherNumber(ctx.customerId, entry.fiscal_year_id, entry.series_code || 'A')
  await supabase.from('accounting_journal_entries').update({ status: 'posted', voucher_number: voucherNumber, posted_at: new Date().toISOString(), posted_by: ctx.user.id, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/accounting/journals')
  return { ok: true, message: `Verifikation bokfördes som ${entry.series_code}${voucherNumber}.` }
}

export async function createInvoiceJournalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const invoiceId = str(formData, 'invoice_id')
  const fiscalYearId = str(formData, 'fiscal_year_id') || null
  const supabase = createAdminClient()
  const [{ data: invoice }, { data: settings }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_customers(name)').eq('id', invoiceId).eq('payment_customer_id', ctx.customerId).maybeSingle(),
    supabase.from('accounting_settings').select('*').eq('payment_customer_id', ctx.customerId).maybeSingle(),
  ])
  if (!invoice) return { ok: false, message: 'Fakturan hittades inte.' }
  const series = settings?.journal_series_invoice || 'F'
  const description = `Kundfaktura ${invoice.invoice_number || invoice.id}`
  const { data: entry } = await supabase.from('accounting_journal_entries').insert({ payment_customer_id: ctx.customerId, fiscal_year_id: fiscalYearId, series_code: series, entry_date: invoice.issue_date, description, source_type: 'invoice_sent', source_id: invoice.id, created_by: ctx.user.id }).select('id').single()
  if (!entry?.id) return { ok: false, message: 'Kunde inte skapa verifikation från faktura.' }
  const rows = [
    { account_number: settings?.default_receivables_account || '1510', debit_amount: Number(invoice.total_amount || 0), credit_amount: 0, line_description: description, sort_order: 0 },
    { account_number: settings?.default_revenue_account || '3001', debit_amount: 0, credit_amount: Number(invoice.subtotal_amount || 0), line_description: 'Försäljning', sort_order: 1 },
  ]
  if (Number(invoice.vat_amount || 0) > 0) rows.push({ account_number: settings?.default_output_vat_account || '2611', debit_amount: 0, credit_amount: Number(invoice.vat_amount || 0), line_description: 'Utgående moms', sort_order: 2 })
  await supabase.from('accounting_journal_lines').insert(rows.map((row) => ({ ...row, payment_customer_id: ctx.customerId, journal_entry_id: entry.id })))
  await supabase.from('invoices').update({ accounting_journal_entry_id: entry.id, accounting_sync_status: 'queued' }).eq('id', invoice.id)
  await supabase.from('accounting_sync_jobs').insert({ payment_customer_id: ctx.customerId, invoice_id: invoice.id, source_type: 'invoice', source_id: invoice.id, journal_entry_id: entry.id, status: 'queued' })
  revalidatePath('/accounting/journals')
  return { ok: true, message: 'Verifikationsutkast skapades från fakturan.' }
}

export async function createAccountingExportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAccountingContext()
  if (!ctx.ok) return { ok: false, message: ctx.message }
  const exportType = str(formData, 'export_type') || 'sie'
  const periodStart = str(formData, 'period_start') || null
  const periodEnd = str(formData, 'period_end') || null
  const supabase = createAdminClient()
  let query = supabase.from('accounting_journal_entries').select('*').eq('payment_customer_id', ctx.customerId).eq('status', 'posted').order('entry_date')
  if (periodStart) query = query.gte('entry_date', periodStart)
  if (periodEnd) query = query.lte('entry_date', periodEnd)
  const [{ data: customer }, { data: journals }] = await Promise.all([
    supabase.from('payment_customers').select('*').eq('id', ctx.customerId).maybeSingle(),
    query,
  ])
  const entryIds = (journals ?? []).map((j: any) => j.id)
  const { data: lines } = entryIds.length ? await supabase.from('accounting_journal_lines').select('*').in('journal_entry_id', entryIds).order('sort_order') : { data: [] }
  const linesByEntry = (lines ?? []).reduce((acc: Record<string, any[]>, line: any) => { (acc[line.journal_entry_id] ||= []).push(line); return acc }, {})
  const content = exportType === 'sie'
    ? buildSieContent({ customer, journals: journals ?? [], linesByEntry, periodStart, periodEnd })
    : ['entry_date,series,voucher,account,debit,credit,description', ...(lines ?? []).map((line: any) => {
        const journal = (journals ?? []).find((j: any) => j.id === line.journal_entry_id)
        return `${journal?.entry_date || ''},${journal?.series_code || ''},${journal?.voucher_number || ''},${line.account_number},${line.debit_amount || 0},${line.credit_amount || 0},"${String(line.line_description || journal?.description || '').replace(/"/g, '""')}"`
      })].join('\n')
  const suffix = exportType === 'sie' ? 'se' : 'csv'
  const { error } = await supabase.from('accounting_exports').insert({ payment_customer_id: ctx.customerId, export_type: exportType, status: 'created', period_start: periodStart, period_end: periodEnd, file_name: `div3rsa-${exportType}-${Date.now()}.${suffix}`, mime_type: exportType === 'sie' ? 'text/plain' : 'text/csv', generated_content: content, generated_by: ctx.user.id })
  if (error) return { ok: false, message: 'Kunde inte skapa export.' }
  revalidatePath('/accounting/exports')
  return { ok: true, message: 'Export skapades.' }
}

export async function adminApproveAccountingConnectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  const customerId = str(formData, 'customer_id')
  if (!customerId) return { ok: false, message: 'Kund saknas.' }
  const supabase = createAdminClient()
  await ensureAccountingDefaults(customerId)
  const { error } = await supabase.from('accounting_connections').upsert({ payment_customer_id: customerId, provider: 'internal', status: 'approved', app_url: 'https://accounting.div3rsa.com', approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'payment_customer_id,provider' })
  if (error) return { ok: false, message: 'Kunde inte aktivera accounting-anslutning.' }
  await supabase.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.role, entity_type: 'accounting_connection', entity_id: customerId, action: 'accounting_connection_approved' })
  revalidatePath('/admin/accounting-access')
  return { ok: true, message: 'Accounting-anslutning aktiverades.' }
}

export async function adminApproveAccountingConnectionFormAction(formData: FormData) {
  await adminApproveAccountingConnectionAction({ ok: false, message: '' }, formData)
}
