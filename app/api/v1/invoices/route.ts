import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'
import { calculateInvoiceTotals, invoiceItemRows, type InvoiceLineInput } from '@/lib/invoices'
import { enqueueWebhookEvent } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, ['invoices:read'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const { searchParams } = new URL(request.url)
  let query = auth.supabase.from('invoices').select('*, invoice_customers(name,email)').eq('payment_customer_id', auth.customerId).order('created_at', { ascending: false }).limit(200)
  const statusParam = searchParams.get('status')
  if (statusParam) query = query.eq('status', statusParam)
  const { data, error } = await query
  const status = error ? 500 : 200
  await logApiRequest({ auth, request, statusCode: status, errorMessage: error?.message })
  if (error) return apiError('Could not list invoices.', status)
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, ['invoices:write'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  let body: any
  try { body = await request.json() } catch { body = {} }
  const invoiceCustomerId = String(body.invoice_customer_id || '').trim()
  const lines: InvoiceLineInput[] = Array.isArray(body.lines) ? body.lines.map((line: any, index: number) => ({
    description: String(line.description || line.name || '').trim(),
    quantity: Number(line.quantity ?? 1),
    unit_price: Number(line.unit_price ?? 0),
    vat_rate: Number(line.vat_rate ?? 25),
    unit: line.unit || 'st',
    product_id: line.product_id || null,
    product_name_snapshot: line.name || null,
    sku_snapshot: line.sku || null,
    sort_order: index,
  })).filter((line: InvoiceLineInput) => line.description) : []
  if (!invoiceCustomerId || !lines.length) { await logApiRequest({ auth, request, statusCode: 400, errorMessage: 'Missing customer or lines.' }); return apiError('invoice_customer_id and lines are required.', 400) }
  const { data: recipient } = await auth.supabase.from('invoice_customers').select('id,currency,default_payment_terms_days').eq('id', invoiceCustomerId).eq('payment_customer_id', auth.customerId).maybeSingle()
  if (!recipient) { await logApiRequest({ auth, request, statusCode: 404, errorMessage: 'Recipient not found.' }); return apiError('Invoice customer not found.', 404) }
  const issueDate = body.issue_date || new Date().toISOString().slice(0, 10)
  const dueDate = body.due_date || new Date(Date.now() + Number(recipient.default_payment_terms_days ?? 30) * 86400000).toISOString().slice(0, 10)
  const totals = calculateInvoiceTotals(lines)
  const { data: invoice, error } = await auth.supabase.from('invoices').insert({
    payment_customer_id: auth.customerId,
    invoice_customer_id: invoiceCustomerId,
    status: 'draft',
    accounting_sync_status: 'not_enabled',
    source: 'api',
    invoice_type: 'invoice',
    issue_date: issueDate,
    due_date: dueDate,
    currency: body.currency || recipient.currency || 'SEK',
    ...totals,
  }).select('*').single()
  if (error || !invoice) { await logApiRequest({ auth, request, statusCode: 500, errorMessage: error?.message }); return apiError('Could not create invoice.', 500) }
  await auth.supabase.from('invoice_items').insert(invoiceItemRows(invoice.id, lines))
  await auth.supabase.from('invoice_events').insert({ invoice_id: invoice.id, payment_customer_id: auth.customerId, actor_role: 'api', event_type: 'invoice_created', description: 'Faktura skapades via API.' })
  await enqueueWebhookEvent({ paymentCustomerId: auth.customerId, eventType: 'invoice.created', source: 'api', entityType: 'invoice', entityId: invoice.id, payload: { invoice_id: invoice.id, status: invoice.status, total_amount: invoice.total_amount, currency: invoice.currency } })
  await logApiRequest({ auth, request, statusCode: 201 })
  return NextResponse.json({ data: invoice }, { status: 201 })
}
