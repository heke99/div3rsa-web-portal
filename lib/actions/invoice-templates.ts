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

function parseTemplateLines(formData: FormData): InvoiceLineInput[] {
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

export async function saveInvoiceTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const id = str(formData, 'id') || null
  const name = str(formData, 'name')
  const description = str(formData, 'description') || null
  const currency = str(formData, 'currency') || 'SEK'
  const lines = parseTemplateLines(formData)

  if (!name) return { ok: false, message: 'Ange namn på fakturamallen.' }
  if (!lines.length) return { ok: false, message: 'Lägg till minst en fakturarad.' }

  const supabase = createAdminClient()
  const payload = {
    payment_customer_id: customerId,
    name,
    description,
    currency,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const query = id
    ? supabase.from('invoice_templates').update(payload).eq('id', id).eq('payment_customer_id', customerId).select('id').single()
    : supabase.from('invoice_templates').insert(payload).select('id').single()

  const { data, error } = await query
  if (error || !data) return { ok: false, message: 'Kunde inte spara fakturamallen.' }

  if (id) await supabase.from('invoice_template_items').delete().eq('template_id', data.id)
  await supabase.from('invoice_template_items').insert(lines.map((line) => ({
    template_id: data.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    sort_order: line.sort_order ?? 0,
  })))

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'invoice_template',
    entity_id: data.id,
    action: id ? 'invoice_template_updated' : 'invoice_template_created',
    new_values: { name, description, currency, line_count: lines.length },
  })

  revalidatePath('/invoice-templates')
  revalidatePath(`/invoice-templates/${data.id}`)
  return { ok: true, message: id ? 'Fakturamallen uppdaterades.' : 'Fakturamallen skapades.' }
}

export async function createInvoiceDraftFromTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const templateId = str(formData, 'template_id')
  const invoiceCustomerId = str(formData, 'invoice_customer_id')
  const issueDate = str(formData, 'issue_date') || new Date().toISOString().slice(0, 10)
  const dueDate = str(formData, 'due_date')

  if (!templateId || !invoiceCustomerId || !dueDate) return { ok: false, message: 'Välj mall, kund och förfallodatum.' }

  const supabase = createAdminClient()
  const [{ data: template }, { data: recipient }, { data: items }] = await Promise.all([
    supabase.from('invoice_templates').select('*').eq('id', templateId).eq('payment_customer_id', customerId).maybeSingle(),
    supabase.from('invoice_customers').select('*').eq('id', invoiceCustomerId).eq('payment_customer_id', customerId).maybeSingle(),
    supabase.from('invoice_template_items').select('*').eq('template_id', templateId).order('sort_order'),
  ])

  if (!template || !recipient) return { ok: false, message: 'Mallen eller kunden hittades inte.' }
  const templateItems = items ?? []
  if (!templateItems.length) return { ok: false, message: 'Fakturamallen saknar rader.' }

  const lines: InvoiceLineInput[] = templateItems.map((item: any, index: number) => ({
    description: item.description,
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.unit_price || 0),
    vat_rate: Number(item.vat_rate ?? 25),
    sort_order: index,
  }))
  const totals = calculateInvoiceTotals(lines)

  const { data: invoice, error } = await supabase.from('invoices').insert({
    payment_customer_id: customerId,
    invoice_customer_id: invoiceCustomerId,
    invoice_template_id: template.id,
    status: 'draft',
    accounting_sync_status: 'not_enabled',
    source: 'portal',
    issue_date: issueDate,
    due_date: dueDate,
    currency: template.currency || recipient.currency || 'SEK',
    ...totals,
    created_by: user.id,
  }).select('id').single()

  if (error || !invoice) return { ok: false, message: 'Kunde inte skapa fakturautkast från mall.' }

  await supabase.from('invoice_items').insert(lines.map((line) => ({
    invoice_id: invoice.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    line_total: line.quantity * line.unit_price,
    sort_order: line.sort_order ?? 0,
  })))

  await supabase.from('invoice_events').insert({
    invoice_id: invoice.id,
    payment_customer_id: customerId,
    actor_user_id: user.id,
    actor_role: user.role,
    event_type: 'created_from_template',
    description: `Fakturautkast skapades från mallen ${template.name}.`,
    metadata: { template_id: template.id },
  })

  revalidatePath('/invoices')
  revalidatePath('/invoice-templates')
  redirect(`/invoices/${invoice.id}`)
}

export async function deleteInvoiceTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const id = str(formData, 'template_id')
  if (!id) return { ok: false, message: 'Fakturamall saknas.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('invoice_templates').delete().eq('id', id).eq('payment_customer_id', customerId)
  if (error) return { ok: false, message: 'Kunde inte ta bort fakturamallen.' }

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'invoice_template',
    entity_id: id,
    action: 'invoice_template_deleted',
  })

  revalidatePath('/invoice-templates')
  redirect('/invoice-templates')
}
