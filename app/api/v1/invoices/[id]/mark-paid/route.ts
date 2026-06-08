import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request, ['invoices:mark_paid'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const { id } = await context.params
  let body: any
  try { body = await request.json() } catch { body = {} }
  const { data: invoice } = await auth.supabase.from('invoices').select('id,total_amount').eq('id', id).eq('payment_customer_id', auth.customerId).maybeSingle()
  if (!invoice) { await logApiRequest({ auth, request, statusCode: 404, errorMessage: 'Invoice not found.' }); return apiError('Invoice not found.', 404) }
  const amount = Number(body.amount ?? invoice.total_amount ?? 0)
  const paidAt = body.paid_at || new Date().toISOString().slice(0, 10)
  await auth.supabase.from('invoice_payments').insert({ invoice_id: id, payment_customer_id: auth.customerId, amount, paid_at: paidAt, reference: body.reference || null, method: 'api' })
  await auth.supabase.from('invoices').update({ status: 'paid', paid_at: paidAt, updated_at: new Date().toISOString() }).eq('id', id).eq('payment_customer_id', auth.customerId)
  await auth.supabase.from('invoice_events').insert({ invoice_id: id, payment_customer_id: auth.customerId, actor_role: 'api', event_type: 'invoice_marked_paid', description: 'Faktura markerades som betald via API.', metadata: { amount } })
  await logApiRequest({ auth, request, statusCode: 200 })
  return NextResponse.json({ data: { id, status: 'paid', paid_at: paidAt } })
}
