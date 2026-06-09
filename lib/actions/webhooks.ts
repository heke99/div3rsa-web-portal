'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireUser } from '@/lib/auth/session'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import { createWebhookSigningSecret, deliverWebhookDelivery, enqueueWebhookEvent } from '@/lib/webhooks'
import { webhookEvents } from '@/lib/webhook-events'
import type { ActionState } from '@/lib/actions/applications'

export type WebhookActionState = ActionState & { signingSecret?: string }

function str(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

async function requireWebhookAccess() {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  const features = await getCustomerFeatures(user.customer_id)
  if (!featureEnabled(features, 'api_access') || !featureEnabled(features, 'api_webhooks')) {
    return { ok: false as const, user, customerId: user.customer_id, message: 'Webhooks kräver aktivering av Div3rsa.' }
  }
  return { ok: true as const, user, customerId: user.customer_id }
}

function selectedEvents(formData: FormData) {
  return webhookEvents.filter((event) => formData.get(`event_${event}`) === 'on')
}

export async function createWebhookEndpointAction(_prev: WebhookActionState, formData: FormData): Promise<WebhookActionState> {
  const access = await requireWebhookAccess()
  if (!access.ok) return { ok: false, message: access.message }

  const name = str(formData, 'name') || 'Webhook endpoint'
  const url = str(formData, 'url')
  const events = selectedEvents(formData)
  if (!url.startsWith('https://')) return { ok: false, message: 'Webhook URL måste börja med https://.' }
  if (!events.length) return { ok: false, message: 'Välj minst en eventtyp.' }

  const signingSecret = createWebhookSigningSecret()
  const supabase = createAdminClient()
  const { error } = await supabase.from('api_webhook_endpoints').insert({
    payment_customer_id: access.customerId,
    name,
    url,
    description: str(formData, 'description') || null,
    signing_secret: signingSecret,
    secret_tail: signingSecret.slice(-6),
    status: 'active',
    events,
    created_by: access.user.id,
  })
  if (error) return { ok: false, message: 'Kunde inte skapa webhook endpoint.' }
  await supabase.from('audit_logs').insert({ actor_user_id: access.user.id, actor_role: access.user.role, entity_type: 'webhook_endpoint', entity_id: access.customerId, action: 'webhook_created', new_values: { name, url, events } })
  revalidatePath('/api-webhooks')
  return { ok: true, message: 'Webhook skapades. Kopiera signing secret nu, den visas bara en gång.', signingSecret }
}

export async function updateWebhookEndpointAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireWebhookAccess()
  if (!access.ok) return { ok: false, message: access.message }
  const id = str(formData, 'webhook_id')
  const events = selectedEvents(formData)
  const url = str(formData, 'url')
  if (!id || !url.startsWith('https://') || !events.length) return { ok: false, message: 'Kontrollera URL och event.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('api_webhook_endpoints').update({
    name: str(formData, 'name') || 'Webhook endpoint',
    url,
    description: str(formData, 'description') || null,
    events,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('payment_customer_id', access.customerId)
  if (error) return { ok: false, message: 'Kunde inte uppdatera webhook.' }
  await supabase.from('audit_logs').insert({ actor_user_id: access.user.id, actor_role: access.user.role, entity_type: 'webhook_endpoint', entity_id: id, action: 'webhook_updated', new_values: { url, events } })
  revalidatePath('/api-webhooks')
  return { ok: true, message: 'Webhook uppdaterades.' }
}

export async function disableWebhookEndpointAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireWebhookAccess()
  if (!access.ok) return { ok: false, message: access.message }
  const id = str(formData, 'webhook_id')
  const supabase = createAdminClient()
  const { error } = await supabase.from('api_webhook_endpoints').update({ status: 'disabled', disabled_at: new Date().toISOString() }).eq('id', id).eq('payment_customer_id', access.customerId)
  if (error) return { ok: false, message: 'Kunde inte inaktivera webhook.' }
  await supabase.from('audit_logs').insert({ actor_user_id: access.user.id, actor_role: access.user.role, entity_type: 'webhook_endpoint', entity_id: id, action: 'webhook_disabled' })
  revalidatePath('/api-webhooks')
  return { ok: true, message: 'Webhook inaktiverades.' }
}

export async function testWebhookEndpointAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireWebhookAccess()
  if (!access.ok) return { ok: false, message: access.message }
  const id = str(formData, 'webhook_id')
  const supabase = createAdminClient()
  const { data: endpoint } = await supabase.from('api_webhook_endpoints').select('id').eq('id', id).eq('payment_customer_id', access.customerId).maybeSingle()
  if (!endpoint) return { ok: false, message: 'Webhook hittades inte.' }

  const event = await enqueueWebhookEvent({
    paymentCustomerId: access.customerId,
    eventType: 'invoice.created',
    source: 'test',
    entityType: 'webhook_endpoint',
    entityId: id,
    payload: { test: true, message: 'Div3rsa webhook test', created_at: new Date().toISOString() },
  })
  if (!event) return { ok: false, message: 'Kunde inte skapa testevent.' }
  const { data: delivery } = await supabase.from('api_webhook_deliveries').select('id').eq('webhook_event_id', event.id).eq('webhook_endpoint_id', id).maybeSingle()
  if (!delivery?.id) return { ok: false, message: 'Endpoint lyssnar inte på testeventet invoice.created.' }
  const result = await deliverWebhookDelivery(delivery.id)
  await supabase.from('api_webhook_endpoints').update({ last_tested_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/api-webhooks')
  return { ok: result.ok, message: result.message }
}

export async function adminRetryWebhookDeliveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const deliveryId = str(formData, 'delivery_id')
  if (!deliveryId) return { ok: false, message: 'Delivery saknas.' }
  const result = await deliverWebhookDelivery(deliveryId)
  revalidatePath('/admin/webhooks')
  return { ok: result.ok, message: result.message }
}

export async function adminRetryWebhookDeliveryFormAction(formData: FormData) {
  await adminRetryWebhookDeliveryAction({ ok: false, message: '' }, formData)
}
