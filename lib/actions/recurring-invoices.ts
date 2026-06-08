'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/session'
import { calculateInvoiceTotals, type InvoiceLineInput } from '@/lib/invoices'
import type { ActionState } from '@/lib/actions/applications'

function str(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function num(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

async function requireCustomerContext() {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  return { user, customerId: user.customer_id }
}

function parseRecurringLines(formData: FormData): InvoiceLineInput[] {
  const lines: InvoiceLineInput[] = []
  for (let index = 0; index < 10; index += 1) {
    const description = str(formData, `line_description_${index}`)
    if (!description) continue
    lines.push({
      description,
      quantity: num(formData.get(`line_quantity_${index}`), 1),
      unit_price: num(formData.get(`line_unit_price_${index}`), 0),
      vat_rate: num(formData.get(`line_vat_rate_${index}`), 25),
      sort_order: index,
    })
  }
  return lines
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function nextRunDate(current: string, frequency: string) {
  const date = new Date(`${current}T00:00:00.000Z`)
  const months = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

export async function saveRecurringInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const id = str(formData, 'id') || null
  const title = str(formData, 'title')
  const invoiceCustomerId = str(formData, 'invoice_customer_id')
  const frequency = str(formData, 'frequency') || 'monthly'
  const startDate = str(formData, 'start_date') || new Date().toISOString().slice(0, 10)
  const endDate = str(formData, 'end_date') || null
  const nextRun = str(formData, 'next_run_date') || startDate
  const status = str(formData, 'status') || 'active'
  const autoSend = formData.get('auto_send') === 'on'
  const currency = str(formData, 'currency') || 'SEK'
  const paymentTermsDays = Math.max(0, Math.round(num(formData.get('payment_terms_days'), 30)))
  const lines = parseRecurringLines(formData)

  if (!title) return { ok: false, message: 'Ange namn på återkommande fakturan.' }
  if (!invoiceCustomerId) return { ok: false, message: 'Välj kund.' }
  if (!lines.length) return { ok: false, message: 'Lägg till minst en fakturarad.' }
  if (!['monthly', 'quarterly', 'yearly', 'custom'].includes(frequency)) return { ok: false, message: 'Ogiltig frekvens.' }

  const supabase = createAdminClient()
  const { data: recipient } = await supabase
    .from('invoice_customers')
    .select('id')
    .eq('id', invoiceCustomerId)
    .eq('payment_customer_id', customerId)
    .maybeSingle()
  if (!recipient) return { ok: false, message: 'Kunden tillhör inte ditt bolag.' }

  const payload = {
    payment_customer_id: customerId,
    invoice_customer_id: invoiceCustomerId,
    title,
    frequency,
    start_date: startDate,
    end_date: endDate,
    next_run_date: nextRun,
    auto_send: autoSend,
    status,
    currency,
    payment_terms_days: paymentTermsDays,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const query = id
    ? supabase.from('recurring_invoice_schedules').update(payload).eq('id', id).eq('payment_customer_id', customerId).select('id').single()
    : supabase.from('recurring_invoice_schedules').insert(payload).select('id').single()

  const { data, error } = await query
  if (error || !data) return { ok: false, message: 'Kunde inte spara återkommande fakturan.' }

  if (id) await supabase.from('recurring_invoice_schedule_items').delete().eq('schedule_id', data.id)
  await supabase.from('recurring_invoice_schedule_items').insert(lines.map((line) => ({
    schedule_id: data.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    sort_order: line.sort_order ?? 0,
  })))

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'recurring_invoice_schedule',
    entity_id: data.id,
    action: id ? 'recurring_invoice_updated' : 'recurring_invoice_created',
    new_values: { title, frequency, auto_send: autoSend, line_count: lines.length },
  })

  revalidatePath('/recurring-invoices')
  revalidatePath(`/recurring-invoices/${data.id}`)
  return { ok: true, message: id ? 'Återkommande fakturan uppdaterades.' : 'Återkommande fakturan skapades.' }
}

export async function createDraftFromRecurringScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const scheduleId = str(formData, 'schedule_id')
  const runDate = str(formData, 'run_date') || new Date().toISOString().slice(0, 10)
  if (!scheduleId) return { ok: false, message: 'Schema saknas.' }

  const supabase = createAdminClient()
  const [{ data: schedule }, { data: items }] = await Promise.all([
    supabase.from('recurring_invoice_schedules').select('*').eq('id', scheduleId).eq('payment_customer_id', customerId).maybeSingle(),
    supabase.from('recurring_invoice_schedule_items').select('*').eq('schedule_id', scheduleId).order('sort_order'),
  ])

  if (!schedule) return { ok: false, message: 'Återkommande fakturan hittades inte.' }
  if (schedule.status !== 'active') return { ok: false, message: 'Schemat är inte aktivt.' }
  const scheduleItems = items ?? []
  if (!scheduleItems.length) return { ok: false, message: 'Schemat saknar fakturarader.' }

  const { data: existingRun } = await supabase
    .from('recurring_invoice_runs')
    .select('id,invoice_id')
    .eq('schedule_id', scheduleId)
    .eq('generated_for_date', runDate)
    .maybeSingle()
  if (existingRun?.invoice_id) return { ok: false, message: 'Det finns redan ett fakturautkast för detta kördatum.' }

  const lines: InvoiceLineInput[] = scheduleItems.map((item: any, index: number) => ({
    description: item.description,
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.unit_price || 0),
    vat_rate: Number(item.vat_rate ?? 25),
    sort_order: index,
  }))
  const totals = calculateInvoiceTotals(lines)
  const dueDate = addDays(runDate, Number(schedule.payment_terms_days ?? 30))

  const { data: invoice, error } = await supabase.from('invoices').insert({
    payment_customer_id: customerId,
    invoice_customer_id: schedule.invoice_customer_id,
    recurring_schedule_id: schedule.id,
    status: 'draft',
    accounting_sync_status: 'not_enabled',
    source: 'recurring',
    issue_date: runDate,
    due_date: dueDate,
    currency: schedule.currency || 'SEK',
    ...totals,
    created_by: user.id,
  }).select('id').single()

  if (error || !invoice) return { ok: false, message: 'Kunde inte skapa fakturautkast.' }

  await supabase.from('invoice_items').insert(lines.map((line) => ({
    invoice_id: invoice.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    line_total: line.quantity * line.unit_price,
    sort_order: line.sort_order ?? 0,
  })))

  await supabase.from('recurring_invoice_runs').insert({
    schedule_id: schedule.id,
    payment_customer_id: customerId,
    invoice_id: invoice.id,
    status: 'created',
    run_date: runDate,
    generated_for_date: runDate,
  })

  await supabase.from('invoice_events').insert({
    invoice_id: invoice.id,
    payment_customer_id: customerId,
    actor_user_id: user.id,
    actor_role: user.role,
    event_type: 'created_from_recurring',
    description: `Fakturautkast skapades från återkommande schema ${schedule.title}.`,
    metadata: { recurring_schedule_id: schedule.id, run_date: runDate },
  })

  await supabase.from('recurring_invoice_schedules').update({
    next_run_date: nextRunDate(runDate, schedule.frequency),
    updated_at: new Date().toISOString(),
  }).eq('id', schedule.id).eq('payment_customer_id', customerId)

  revalidatePath('/recurring-invoices')
  revalidatePath(`/recurring-invoices/${schedule.id}`)
  revalidatePath('/invoices')
  redirect(`/invoices/${invoice.id}`)
}

export async function updateRecurringInvoiceStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const scheduleId = str(formData, 'schedule_id')
  const status = str(formData, 'status')
  if (!scheduleId || !['active', 'paused', 'ended'].includes(status)) return { ok: false, message: 'Ogiltig status.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('recurring_invoice_schedules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('payment_customer_id', customerId)

  if (error) return { ok: false, message: 'Kunde inte uppdatera status.' }

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'recurring_invoice_schedule',
    entity_id: scheduleId,
    action: 'recurring_invoice_status_updated',
    new_values: { status },
  })

  revalidatePath('/recurring-invoices')
  revalidatePath(`/recurring-invoices/${scheduleId}`)
  return { ok: true, message: 'Status uppdaterades.' }
}
