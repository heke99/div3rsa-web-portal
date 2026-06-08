import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request, ['invoices:read'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const { id } = await context.params
  const [{ data: invoice, error }, { data: items }] = await Promise.all([
    auth.supabase.from('invoices').select('*, invoice_customers(*)').eq('id', id).eq('payment_customer_id', auth.customerId).maybeSingle(),
    auth.supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
  ])
  const status = error ? 500 : invoice ? 200 : 404
  await logApiRequest({ auth, request, statusCode: status, errorMessage: error?.message || (!invoice ? 'Not found' : null) })
  if (error) return apiError('Could not fetch invoice.', 500)
  if (!invoice) return apiError('Invoice not found.', 404)
  return NextResponse.json({ data: { ...invoice, items: items ?? [] } })
}
