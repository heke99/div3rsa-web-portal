import 'server-only'
import { createHmac, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WebhookEventType } from '@/lib/webhook-events'

export function createWebhookSigningSecret() {
  return `whsec_${randomBytes(32).toString('base64url')}`
}

export function signWebhookPayload(secret: string, timestamp: string, body: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export async function enqueueWebhookEvent(input: {
  paymentCustomerId: string
  eventType: WebhookEventType | string
  payload: Record<string, unknown>
  source?: string
  entityType?: string
  entityId?: string | null
}) {
  const supabase = createAdminClient()
  const { data: event } = await supabase
    .from('api_webhook_events')
    .insert({
      payment_customer_id: input.paymentCustomerId,
      event_type: input.eventType,
      payload: input.payload,
      source: input.source || 'portal',
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
    })
    .select('id,event_type,payload')
    .single()

  if (!event) return null

  const { data: endpoints } = await supabase
    .from('api_webhook_endpoints')
    .select('id,events,status')
    .eq('payment_customer_id', input.paymentCustomerId)
    .eq('status', 'active')

  const deliveries = (endpoints ?? [])
    .filter((endpoint: any) => Array.isArray(endpoint.events) && endpoint.events.includes(input.eventType))
    .map((endpoint: any) => ({
      payment_customer_id: input.paymentCustomerId,
      webhook_endpoint_id: endpoint.id,
      webhook_event_id: event.id,
      event_type: input.eventType,
      payload: input.payload,
      status: 'pending',
      attempts: 0,
    }))

  if (deliveries.length) await supabase.from('api_webhook_deliveries').insert(deliveries)
  return event
}

export async function deliverWebhookDelivery(deliveryId: string) {
  const supabase = createAdminClient()
  const { data: delivery } = await supabase
    .from('api_webhook_deliveries')
    .select('*, api_webhook_endpoints(url,signing_secret,status)')
    .eq('id', deliveryId)
    .maybeSingle()

  if (!delivery?.api_webhook_endpoints || delivery.api_webhook_endpoints.status !== 'active') {
    await supabase.from('api_webhook_deliveries').update({ status: 'disabled', last_error: 'Webhook endpoint is disabled.' }).eq('id', deliveryId)
    return { ok: false, message: 'Webhook endpoint is disabled.' }
  }

  const endpoint = delivery.api_webhook_endpoints as any
  const body = JSON.stringify({ id: delivery.webhook_event_id, type: delivery.event_type, created_at: delivery.created_at, data: delivery.payload })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = endpoint.signing_secret ? `t=${timestamp},v1=${signWebhookPayload(endpoint.signing_secret, timestamp, body)}` : null

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Div3rsa-Webhooks/1.0',
        ...(signature ? { 'x-div3rsa-signature': signature } : {}),
        'x-div3rsa-event': delivery.event_type,
        'x-div3rsa-delivery-id': delivery.id,
      },
      body,
    })
    const text = await response.text()
    const ok = response.status >= 200 && response.status < 300
    await supabase.from('api_webhook_deliveries').update({
      status: ok ? 'delivered' : 'failed',
      attempts: Number(delivery.attempts || 0) + 1,
      response_status: response.status,
      response_body: text.slice(0, 2000),
      signature_header: signature,
      last_error: ok ? null : `HTTP ${response.status}`,
      delivered_at: ok ? new Date().toISOString() : null,
      next_attempt_at: ok ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }).eq('id', deliveryId)
    await supabase.from('api_webhook_endpoints').update({ last_delivery_at: new Date().toISOString(), last_error: ok ? null : `HTTP ${response.status}` }).eq('id', delivery.webhook_endpoint_id)
    return { ok, message: ok ? 'Webhook levererades.' : `Webhook misslyckades: HTTP ${response.status}` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt webhook-fel.'
    await supabase.from('api_webhook_deliveries').update({
      status: 'failed',
      attempts: Number(delivery.attempts || 0) + 1,
      last_error: message,
      next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }).eq('id', deliveryId)
    await supabase.from('api_webhook_endpoints').update({ last_error: message }).eq('id', delivery.webhook_endpoint_id)
    return { ok: false, message }
  }
}
