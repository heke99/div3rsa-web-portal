import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, ['customers:read'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const { data, error } = await auth.supabase.from('invoice_customers').select('*').eq('payment_customer_id', auth.customerId).order('created_at', { ascending: false }).limit(200)
  const status = error ? 500 : 200
  await logApiRequest({ auth, request, statusCode: status, errorMessage: error?.message })
  if (error) return apiError('Could not list customers.', status)
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, ['customers:write'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  let body: any
  try { body = await request.json() } catch { body = {} }
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  if (!name || !email) { await logApiRequest({ auth, request, statusCode: 400, errorMessage: 'Missing name or email.' }); return apiError('name and email are required.', 400) }
  const { data, error } = await auth.supabase.from('invoice_customers').insert({
    payment_customer_id: auth.customerId,
    customer_type: body.customer_type || 'company',
    name,
    organization_number: body.organization_number || null,
    contact_person: body.contact_person || null,
    email,
    phone: body.phone || null,
    address_line_1: body.address_line_1 || null,
    address_line_2: body.address_line_2 || null,
    postal_code: body.postal_code || null,
    city: body.city || null,
    country: body.country || 'SE',
    invoice_reference: body.invoice_reference || null,
    default_payment_terms_days: Number(body.default_payment_terms_days ?? 30),
    default_vat_rate: Number(body.default_vat_rate ?? 25),
    currency: body.currency || 'SEK',
    notes: body.notes || null,
  }).select('*').single()
  const status = error ? 500 : 201
  await logApiRequest({ auth, request, statusCode: status, errorMessage: error?.message })
  if (error) return apiError('Could not create customer.', status)
  return NextResponse.json({ data }, { status })
}
