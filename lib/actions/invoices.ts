'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/session'
import { sendSmtpMail } from '@/lib/mail/smtp'
import { buildInvoiceHtml, calculateInvoiceTotals, getNextInvoiceNumber, resolveAccountingSyncStatus, type InvoiceLineInput } from '@/lib/invoices'
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

function parseLines(formData: FormData): InvoiceLineInput[] {
  const lines: InvoiceLineInput[] = []
  for (let index = 0; index < 8; index += 1) {
    const description = str(formData, `line_description_${index}`)
    if (!description) continue
    const quantity = num(formData.get(`line_quantity_${index}`), 1)
    const unit_price = num(formData.get(`line_unit_price_${index}`), 0)
    const vat_rate = num(formData.get(`line_vat_rate_${index}`), 25)
    lines.push({ description, quantity, unit_price, vat_rate, sort_order: index })
  }
  return lines
}

export async function saveInvoiceDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const invoiceCustomerId = str(formData, 'invoice_customer_id')
  const issueDate = str(formData, 'issue_date') || new Date().toISOString().slice(0, 10)
  const dueDate = str(formData, 'due_date')
  const currency = str(formData, 'currency') || 'SEK'
  const lines = parseLines(formData)

  if (!invoiceCustomerId) return { ok: false, message: 'Välj fakturamottagare.' }
  if (!dueDate) return { ok: false, message: 'Ange förfallodatum.' }
  if (!lines.length) return { ok: false, message: 'Lägg till minst en fakturarad.' }

  const totals = calculateInvoiceTotals(lines)
  const supabase = createAdminClient()
  const { data: recipient } = await supabase
    .from('invoice_customers')
    .select('id')
    .eq('id', invoiceCustomerId)
    .eq('payment_customer_id', customerId)
    .maybeSingle()
  if (!recipient) return { ok: false, message: 'Fakturamottagaren tillhör inte ditt bolag.' }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      payment_customer_id: customerId,
      invoice_customer_id: invoiceCustomerId,
      status: 'draft',
      accounting_sync_status: 'not_enabled',
      source: 'portal',
      issue_date: issueDate,
      due_date: dueDate,
      currency,
      ...totals,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error || !invoice) return { ok: false, message: 'Kunde inte skapa fakturan.' }

  const itemRows = lines.map((line) => ({
    invoice_id: invoice.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    line_total: line.quantity * line.unit_price,
    sort_order: line.sort_order ?? 0,
  }))
  await supabase.from('invoice_items').insert(itemRows)
  await supabase.from('invoice_events').insert({ invoice_id: invoice.id, payment_customer_id: customerId, actor_user_id: user.id, actor_role: user.role, event_type: 'created', description: 'Faktura skapades som utkast.' })

  revalidatePath('/invoices')
  redirect(`/invoices/${invoice.id}`)
}

export async function sendInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const invoiceId = str(formData, 'invoice_id')
  if (!invoiceId) return { ok: false, message: 'Faktura saknas.' }

  const supabase = createAdminClient()
  const [{ data: invoice }, { data: customer }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', invoiceId).eq('payment_customer_id', customerId).maybeSingle(),
    supabase.from('payment_customers').select('*').eq('id', customerId).maybeSingle(),
  ])
  if (!invoice || !customer) return { ok: false, message: 'Fakturan hittades inte.' }

  const [{ data: recipient }, { data: items }] = await Promise.all([
    supabase.from('invoice_customers').select('*').eq('id', invoice.invoice_customer_id).eq('payment_customer_id', customerId).maybeSingle(),
    supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order'),
  ])
  if (!recipient?.email) return { ok: false, message: 'Fakturamottagaren saknar e-post.' }

  const invoiceNumber = invoice.invoice_number || await getNextInvoiceNumber(customerId, invoice.issue_date)
  const accountingSyncStatus = await resolveAccountingSyncStatus(customerId)
  const invoiceForHtml = { ...invoice, invoice_number: invoiceNumber }
  const html = buildInvoiceHtml({ invoice: invoiceForHtml, customer, recipient, items: items ?? [] })
  const subject = `Faktura ${invoiceNumber} från ${customer.company_name}`
  let emailStatus = 'sent'
  let errorMessage: string | null = null
  let providerMessageId: string | null = null

  try {
    const result = await sendSmtpMail({
      to: recipient.email,
      subject,
      html,
      text: `Hej,\n\nHär kommer faktura ${invoiceNumber} från ${customer.company_name}. Belopp: ${invoice.total_amount} ${invoice.currency}.\n\nVänliga hälsningar,\n${customer.company_name}`,
      replyTo: customer.email,
    })
    providerMessageId = typeof result.messageId === 'string' ? result.messageId : null
  } catch (error) {
    console.error('Invoice SMTP error', error)
    emailStatus = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Okänt SMTP-fel.'
  }

  await supabase.from('invoice_email_logs').insert({ invoice_id: invoiceId, payment_customer_id: customerId, recipient: recipient.email, subject, status: emailStatus, provider_message_id: providerMessageId, error_message: errorMessage, sent_at: emailStatus === 'sent' ? new Date().toISOString() : null })

  await supabase.from('invoices').update({
    invoice_number: invoiceNumber,
    status: emailStatus === 'sent' ? 'sent' : 'failed',
    accounting_sync_status: emailStatus === 'sent' ? accountingSyncStatus : invoice.accounting_sync_status,
    sent_at: emailStatus === 'sent' ? new Date().toISOString() : invoice.sent_at,
    updated_at: new Date().toISOString(),
  }).eq('id', invoiceId).eq('payment_customer_id', customerId)

  await supabase.from('invoice_events').insert({
    invoice_id: invoiceId,
    payment_customer_id: customerId,
    actor_user_id: user.id,
    actor_role: user.role,
    event_type: emailStatus === 'sent' ? 'sent' : 'email_failed',
    description: emailStatus === 'sent' ? 'Fakturan skickades via SMTP.' : `Mail kunde inte skickas: ${errorMessage}`,
  })

  if (emailStatus === 'sent' && accountingSyncStatus === 'queued') {
    await supabase.from('accounting_sync_jobs').insert({ payment_customer_id: customerId, invoice_id: invoiceId, provider: 'internal', status: 'queued' })
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  return { ok: emailStatus === 'sent', message: emailStatus === 'sent' ? 'Fakturan skickades.' : 'Fakturan sparades, men mail kunde inte skickas.' }
}

export async function markInvoicePaidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const invoiceId = str(formData, 'invoice_id')
  const amount = num(formData.get('amount'), 0)
  const reference = str(formData, 'reference') || null
  const paidAt = str(formData, 'paid_at') || new Date().toISOString().slice(0, 10)
  if (!invoiceId || amount <= 0) return { ok: false, message: 'Ange betalningsbelopp.' }

  const supabase = createAdminClient()
  const { data: invoice } = await supabase.from('invoices').select('id').eq('id', invoiceId).eq('payment_customer_id', customerId).maybeSingle()
  if (!invoice) return { ok: false, message: 'Fakturan hittades inte.' }

  await supabase.from('invoice_payments').insert({ invoice_id: invoiceId, payment_customer_id: customerId, amount, paid_at: paidAt, reference, method: 'manual', created_by: user.id })
  await supabase.from('invoices').update({ status: 'paid', paid_at: paidAt, updated_at: new Date().toISOString() }).eq('id', invoiceId)
  await supabase.from('invoice_events').insert({ invoice_id: invoiceId, payment_customer_id: customerId, actor_user_id: user.id, actor_role: user.role, event_type: 'paid', description: 'Fakturan markerades som betald manuellt.' })
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  return { ok: true, message: 'Fakturan markerades som betald.' }
}
