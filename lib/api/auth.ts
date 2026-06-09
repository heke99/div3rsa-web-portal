import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

import type { ApiScope } from '@/lib/api/scopes'

const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 120

export function hashApiKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function createPlainApiKey() {
  return `div3rsa_live_${randomBytes(32).toString('base64url')}`
}

export function createRequestId() {
  return `req_${randomBytes(12).toString('base64url')}`
}

export function getBearerKey(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim()
  return request.headers.get('x-api-key')?.trim() || ''
}

async function checkRateLimit(input: { apiKeyId: string; customerId: string; routeKey: string }) {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()
  const { count } = await supabase
    .from('api_rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', input.apiKeyId)
    .eq('route_key', input.routeKey)
    .gte('created_at', since)

  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) return false
  await supabase.from('api_rate_limit_events').insert({
    payment_customer_id: input.customerId,
    api_key_id: input.apiKeyId,
    route_key: input.routeKey,
  })
  return true
}

export async function authenticateApiRequest(request: Request, requiredScopes: ApiScope[] = []) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-request-id') || createRequestId()
  const supabase = createAdminClient()
  const key = getBearerKey(request)
  const path = new URL(request.url).pathname
  if (!key) return { ok: false as const, status: 401, error: 'Missing API key.', startedAt, path, requestId }

  const keyHash = hashApiKey(key)
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .maybeSingle()

  if (!apiKey) return { ok: false as const, status: 401, error: 'Invalid API key.', startedAt, path, requestId }
  if (apiKey.expires_at && new Date(apiKey.expires_at).getTime() < Date.now()) {
    return { ok: false as const, status: 401, error: 'API key has expired.', startedAt, path, requestId, apiKey }
  }

  const features = await getCustomerFeatures(apiKey.payment_customer_id)
  if (!featureEnabled(features, 'api_access')) {
    return { ok: false as const, status: 403, error: 'API access is not enabled for this customer.', startedAt, path, requestId, apiKey }
  }

  const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : []
  const missingScope = requiredScopes.find((scope) => !scopes.includes(scope))
  if (missingScope) {
    return { ok: false as const, status: 403, error: `Missing scope: ${missingScope}`, startedAt, path, requestId, apiKey }
  }

  const routeKey = `${request.method}:${path}`
  const allowed = await checkRateLimit({ apiKeyId: apiKey.id, customerId: apiKey.payment_customer_id, routeKey })
  if (!allowed) {
    return { ok: false as const, status: 429, error: 'Rate limit exceeded. Try again later.', startedAt, path, requestId, apiKey }
  }

  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id)
  return { ok: true as const, apiKey, customerId: apiKey.payment_customer_id as string, startedAt, path, requestId, supabase }
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
    request_id: auth?.requestId || null,
    ip_address: input.request.headers.get('x-forwarded-for'),
    user_agent: input.request.headers.get('user-agent'),
    error_message: input.errorMessage || null,
    duration_ms: auth?.startedAt ? Date.now() - auth.startedAt : null,
  })
}

export function apiError(message: string, status = 400, requestId?: string) {
  return NextResponse.json({ error: message, request_id: requestId || null }, { status })
}
