import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

import type { ApiScope } from '@/lib/api/scopes'

export function hashApiKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function createPlainApiKey() {
  return `div3rsa_live_${randomBytes(32).toString('base64url')}`
}

export function getBearerKey(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim()
  return request.headers.get('x-api-key')?.trim() || ''
}

export async function authenticateApiRequest(request: Request, requiredScopes: ApiScope[] = []) {
  const startedAt = Date.now()
  const supabase = createAdminClient()
  const key = getBearerKey(request)
  const path = new URL(request.url).pathname
  if (!key) return { ok: false as const, status: 401, error: 'Missing API key.', startedAt, path }

  const keyHash = hashApiKey(key)
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .maybeSingle()

  if (!apiKey) return { ok: false as const, status: 401, error: 'Invalid API key.', startedAt, path }
  if (apiKey.expires_at && new Date(apiKey.expires_at).getTime() < Date.now()) return { ok: false as const, status: 401, error: 'API key has expired.', startedAt, path, apiKey }

  const features = await getCustomerFeatures(apiKey.payment_customer_id)
  if (!featureEnabled(features, 'api_access')) return { ok: false as const, status: 403, error: 'API access is not enabled for this customer.', startedAt, path, apiKey }

  const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : []
  const missingScope = requiredScopes.find((scope) => !scopes.includes(scope))
  if (missingScope) return { ok: false as const, status: 403, error: `Missing scope: ${missingScope}`, startedAt, path, apiKey }

  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id)
  return { ok: true as const, apiKey, customerId: apiKey.payment_customer_id as string, startedAt, path, supabase }
}

export async function logApiRequest(input: { auth: any; request: Request; statusCode: number; errorMessage?: string | null }) {
  const supabase = createAdminClient()
  const auth = input.auth
  const path = new URL(input.request.url).pathname
  await supabase.from('api_request_logs').insert({
    payment_customer_id: auth?.apiKey?.payment_customer_id || auth?.customerId || null,
    api_key_id: auth?.apiKey?.id || null,
    method: input.request.method,
    path,
    status_code: input.statusCode,
    ip_address: input.request.headers.get('x-forwarded-for'),
    user_agent: input.request.headers.get('user-agent'),
    error_message: input.errorMessage || null,
    duration_ms: auth?.startedAt ? Date.now() - auth.startedAt : null,
  })
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
