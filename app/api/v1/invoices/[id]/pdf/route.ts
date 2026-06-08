import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'
import { buildInvoiceHtml, getInvoiceSettings } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request, ['invoices:read'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const { id } = await context.params
  const [{ data: invoice }, { data: customer }] = await Promise.all([
    auth.supabase.from('invoices').select('*').eq('id', id).eq('payment_customer_id', auth.customerId).maybeSingle(),
    auth.supabase.from('payment_customers').select('*').eq('id', auth.customerId).maybeSingle(),
  ])
  if (!invoice || !customer) { await logApiRequest({ auth, request, statusCode: 404, errorMessage: 'Invoice not found.' }); return apiError('Invoice not found.', 404) }
  const [{ data: recipient }, { data: items }, settings] = await Promise.all([
    auth.supabase.from('invoice_customers').select('*').eq('id', invoice.invoice_customer_id).eq('payment_customer_id', auth.customerId).maybeSingle(),
    auth.supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    getInvoiceSettings(auth.customerId),
  ])
  if (!recipient) { await logApiRequest({ auth, request, statusCode: 404, errorMessage: 'Recipient not found.' }); return apiError('Recipient not found.', 404) }
  const html = buildInvoiceHtml({ invoice, customer, recipient, items: items ?? [], settings })
  await auth.supabase.from('invoice_events').insert({ invoice_id: id, payment_customer_id: auth.customerId, actor_role: 'api', event_type: 'invoice_pdf_generated', description: 'PDF-ready HTML hämtades via API.' })
  await logApiRequest({ auth, request, statusCode: 200 })
  return new NextResponse(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}
