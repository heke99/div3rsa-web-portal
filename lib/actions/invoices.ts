'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireUser } from '@/lib/auth/session'
import { sendSmtpMail } from '@/lib/mail/smtp'
import { buildInvoiceHtml, calculateInvoiceTotals, getInvoiceSettings, getNextInvoiceNumber, invoiceItemRows, resolveAccountingSyncStatus, type InvoiceLineInput } from '@/lib/invoices'
import type { ActionState } from '@/lib/actions/applications'

function str(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true'
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

async function buildLineFromForm(input: { formData: FormData; index: number; customerId: string; userId: string; supabase: ReturnType<typeof createAdminClient> }) {
  const { formData, index, customerId, userId, supabase } = input
  const productId = str(formData, `line_product_id_${index}`)
  const customName = str(formData, `line_custom_name_${index}`)
  const description = str(formData, `line_description_${index}`)
  const sku = str(formData, `line_sku_${index}`) || null
  const unit = str(formData, `line_unit_${index}`) || 'st'
  const quantity = num(formData.get(`line_quantity_${index}`), 1)
  const unitPrice = num(formData.get(`line_unit_price_${index}`), 0)
  const vatRate = num(formData.get(`line_vat_rate_${index}`), 25)
  const saveProduct = bool(formData, `line_save_product_${index}`)

  if (productId) {
    const { data: product } = await supabase
      .from('invoice_products')
      .select('*')
      .eq('id', productId)
      .eq('payment_customer_id', customerId)
      .maybeSingle()
    if (!product) return null
    return {
      description: description || product.description || product.name,
      quantity,
      unit_price: unitPrice || Number(product.unit_price || 0),
      vat_rate: Number.isFinite(vatRate) ? vatRate : Number(product.vat_rate ?? 25),
      sort_order: index,
      product_id: product.id,
      product_name_snapshot: product.name,
      sku_snapshot: product.sku || null,
      unit: unit || product.unit || 'st',
    } as InvoiceLineInput
  }

  const lineName = customName || description
  if (!lineName) return null
  let createdProductId: string | null = null
  if (saveProduct) {
    const { data: createdProduct } = await supabase.from('invoice_products').insert({
      payment_customer_id: customerId,
      name: customName || description,
      description,
      sku,
      unit,
      unit_price: unitPrice,
      vat_rate: vatRate,
      currency: str(formData, 'currency') || 'SEK',
      is_active: true,
      created_by: userId,
    }).select('id').single()
    createdProductId = createdProduct?.id || null
  }

  return {
    description: description || lineName,
    quantity,
    unit_price: unitPrice,
    vat_rate: vatRate,
    sort_order: index,
    product_id: createdProductId,
    product_name_snapshot: lineName,
    sku_snapshot: sku,
    unit,
  } as InvoiceLineInput
}

async function parseLines(formData: FormData, customerId: string, userId: string): Promise<InvoiceLineInput[]> {
  const supabase = createAdminClient()
  const lines: InvoiceLineInput[] = []
  for (let index = 0; index < 8; index += 1) {
    const line = await buildLineFromForm({ formData, index, customerId, userId, supabase })
    if (line) lines.push(line)
  }
  return lines
}

export async function saveInvoiceDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const invoiceCustomerId = str(formData, 'invoice_customer_id')
  const issueDate = str(formData, 'issue_date') || new Date().toISOString().slice(0, 10)
  const dueDate = str(formData, 'due_date')
  const currency = str(formData, 'currency') || 'SEK'
  const lines = await parseLines(formData, customerId, user.id)

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
      invoice_type: 'invoice',
      issue_date: issueDate,
      due_date: dueDate,
      currency,
      ...totals,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error || !invoice) return { ok: false, message: 'Kunde inte skapa fakturan.' }

  await supabase.from('invoice_items').insert(invoiceItemRows(invoice.id, lines))
  await supabase.from('invoice_events').insert({ invoice_id: invoice.id, payment_customer_id: customerId, actor_user_id: user.id, actor_role: user.role, event_type: 'invoice_created', description: 'Faktura skapades som utkast.', metadata: { line_count: lines.length } })
  if (lines.some((line) => line.product_id)) {
    await supabase.from('invoice_events').insert({ invoice_id: invoice.id, payment_customer_id: customerId, actor_user_id: user.id, actor_role: user.role, event_type: 'product_added', description: 'En eller flera artiklar kopplades till fakturan.' })
  }

  revalidatePath('/invoices')
  redirect(`/invoices/${invoice.id}`)
}

async function sendInvoiceById(input: { invoiceId: string; customerId?: string; actorUserId?: string | null; actorRole?: string | null; adminMode?: boolean }) {
  const { invoiceId, customerId, actorUserId, actorRole, adminMode } = input
  const supabase = createAdminClient()
  const invoiceQuery = supabase.from('invoices').select('*').eq('id', invoiceId)
  if (!adminMode && customerId) invoiceQuery.eq('payment_customer_id', customerId)
  const { data: invoice } = await invoiceQuery.maybeSingle()
  if (!invoice) return { ok: false, message: 'Fakturan hittades inte.' }

  const effectiveCustomerId = invoice.payment_customer_id
  const [{ data: customer }, { data: recipient }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from('payment_customers').select('*').eq('id', effectiveCustomerId).maybeSingle(),
    supabase.from('invoice_customers').select('*').eq('id', invoice.invoice_customer_id).eq('payment_customer_id', effectiveCustomerId).maybeSingle(),
    supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order'),
    supabase.from('invoice_settings').select('*').eq('payment_customer_id', effectiveCustomerId).maybeSingle(),
  ])
  if (!customer || !recipient) return { ok: false, message: 'Fakturan saknar kund eller mottagare.' }
  if (!recipient.email) return { ok: false, message: 'Fakturamottagaren saknar e-post.' }

  const alreadySent = Boolean(invoice.sent_at || invoice.invoice_number)
  const invoiceNumber = invoice.invoice_number || await getNextInvoiceNumber(effectiveCustomerId, invoice.issue_date)
  const accountingSyncStatus = await resolveAccountingSyncStatus(effectiveCustomerId)
  const invoiceForHtml = { ...invoice, invoice_number: invoiceNumber }
  const html = buildInvoiceHtml({ invoice: invoiceForHtml, customer, recipient, items: items ?? [], settings })
  const subject = `Faktura ${invoiceNumber} från ${settings?.seller_name || customer.company_name}`
  let emailStatus = 'sent'
  let errorMessage: string | null = null
  let providerMessageId: string | null = null

  try {
    const result = await sendSmtpMail({
      to: recipient.email,
      subject,
      html,
      text: `Hej,\n\nHär kommer faktura ${invoiceNumber} från ${settings?.seller_name || customer.company_name}. Belopp: ${invoice.total_amount} ${invoice.currency}.\n\nVänliga hälsningar,\n${settings?.seller_name || customer.company_name}`,
      replyTo: settings?.seller_email || customer.email,
    })
    providerMessageId = typeof result.messageId === 'string' ? result.messageId : null
  } catch (error) {
    console.error('Invoice SMTP error', error)
    emailStatus = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Okänt SMTP-fel.'
  }

  const { data: emailLog } = await supabase.from('invoice_email_logs').insert({ invoice_id: invoiceId, payment_customer_id: effectiveCustomerId, recipient: recipient.email, subject, status: emailStatus, provider_message_id: providerMessageId, error_message: errorMessage, sent_at: emailStatus === 'sent' ? new Date().toISOString() : null }).select('id').single()

  const updatePayload: Record<string, any> = {
    invoice_number: invoiceNumber,
    updated_at: new Date().toISOString(),
  }
  if (emailStatus === 'sent') {
    updatePayload.accounting_sync_status = accountingSyncStatus
    updatePayload.sent_at = invoice.sent_at || new Date().toISOString()
    if (!['paid', 'overdue', 'cancelled', 'credited'].includes(invoice.status)) updatePayload.status = 'sent'
  } else if (!alreadySent) {
    updatePayload.status = 'failed'
  }
  await supabase.from('invoices').update(updatePayload).eq('id', invoiceId).eq('payment_customer_id', effectiveCustomerId)

  await supabase.from('invoice_events').insert({
    invoice_id: invoiceId,
    payment_customer_id: effectiveCustomerId,
    actor_user_id: actorUserId || null,
    actor_role: actorRole || null,
    event_type: emailStatus === 'sent' ? (alreadySent ? 'invoice_resent' : 'invoice_sent') : 'invoice_email_failed',
    description: emailStatus === 'sent' ? (alreadySent ? 'Fakturan skickades om via SMTP.' : 'Fakturan skickades via SMTP.') : `Mail kunde inte skickas: ${errorMessage}`,
    metadata: { email_log_id: emailLog?.id || null },
  })

  if (emailStatus === 'sent' && accountingSyncStatus === 'queued' && !alreadySent) {
    await supabase.from('accounting_sync_jobs').insert({ payment_customer_id: effectiveCustomerId, invoice_id: invoiceId, provider: 'internal', status: 'queued' })
  }

  return { ok: emailStatus === 'sent', message: emailStatus === 'sent' ? (alreadySent ? 'Fakturan skickades om.' : 'Fakturan skickades.') : 'Fakturan sparades, men mail kunde inte skickas.' }
}

export async function sendInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const invoiceId = str(formData, 'invoice_id')
  if (!invoiceId) return { ok: false, message: 'Faktura saknas.' }
  const result = await sendInvoiceById({ invoiceId, customerId, actorUserId: user.id, actorRole: user.role })
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  return result
}

export async function adminResendInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  const invoiceId = str(formData, 'invoice_id')
  if (!invoiceId) return { ok: false, message: 'Faktura saknas.' }
  const result = await sendInvoiceById({ invoiceId, actorUserId: user.id, actorRole: user.role, adminMode: true })
  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${invoiceId}`)
  return result
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
  await supabase.from('invoice_events').insert({ invoice_id: invoiceId, payment_customer_id: customerId, actor_user_id: user.id, actor_role: user.role, event_type: 'invoice_marked_paid', description: 'Fakturan markerades som betald manuellt.', metadata: { amount } })
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  return { ok: true, message: 'Fakturan markerades som betald.' }
}
