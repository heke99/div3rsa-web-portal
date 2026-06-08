import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'
import { getCustomerFeatures } from '@/lib/features'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, ['accounting:read'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const [{ data: connection }, { data: jobs }, features] = await Promise.all([
    auth.supabase.from('accounting_connections').select('provider,status,last_sync_at,last_error,created_at,updated_at').eq('payment_customer_id', auth.customerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    auth.supabase.from('accounting_sync_jobs').select('id,invoice_id,status,last_error,created_at,updated_at').eq('payment_customer_id', auth.customerId).order('created_at', { ascending: false }).limit(20),
    getCustomerFeatures(auth.customerId),
  ])
  await logApiRequest({ auth, request, statusCode: 200 })
  return NextResponse.json({ data: { features, connection, recent_jobs: jobs ?? [] } })
}
