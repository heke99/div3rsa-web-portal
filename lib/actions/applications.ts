'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requirePricingAdmin } from '@/lib/auth/session'
import { applicationStatuses } from '@/lib/data/status'
import { sendSmtpMail } from '@/lib/mail/smtp'

export type ActionState = { ok: boolean; message: string }

async function logAudit(input: {
  actorUserId: string
  actorRole: string
  entityType: string
  entityId: string
  action: string
  oldValues?: unknown
  newValues?: unknown
}) {
  const supabase = createAdminClient()
  await supabase.from('audit_logs').insert({
    actor_user_id: input.actorUserId,
    actor_role: input.actorRole,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
  })
}

export async function updateApplicationStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  const id = String(formData.get('application_id') || '')
  const status = String(formData.get('status') || '')

  if (!id || !applicationStatuses.includes(status as any)) return { ok: false, message: 'Ogiltig status.' }

  const supabase = createAdminClient()
  const { data: current } = await supabase.from('payment_applications').select('status').eq('id', id).maybeSingle()
  const { error } = await supabase.from('payment_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)

  if (error) return { ok: false, message: 'Kunde inte uppdatera status.' }

  await supabase.from('payment_application_events').insert({
    application_id: id,
    event_type: 'status_changed',
    description: `Status ändrades från ${current?.status ?? 'okänd'} till ${status}.`,
    created_by: user.id,
  })

  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_application', entityId: id, action: 'status_changed', oldValues: current, newValues: { status } })
  revalidatePath(`/admin/payment-applications/${id}`)
  revalidatePath('/admin/payment-applications')
  return { ok: true, message: 'Status uppdaterad.' }
}

export async function addApplicationNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  const id = String(formData.get('application_id') || '')
  const note = String(formData.get('note') || '').trim()

  if (!id || note.length < 2) return { ok: false, message: 'Skriv en anteckning.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('payment_application_notes').insert({ application_id: id, admin_user_id: user.id, note })

  if (error) return { ok: false, message: 'Kunde inte spara anteckningen.' }

  await supabase.from('payment_application_events').insert({ application_id: id, event_type: 'note_added', description: 'Intern anteckning lades till.', created_by: user.id })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_application', entityId: id, action: 'note_added', newValues: { note } })
  revalidatePath(`/admin/payment-applications/${id}`)
  return { ok: true, message: 'Anteckning sparad.' }
}

export async function createCustomerFromApplicationAction(formData: FormData) {
  const user = await requirePricingAdmin()
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) redirect('/admin/payment-applications')

  const supabase = createAdminClient()
  const { data: app, error: appError } = await supabase.from('payment_applications').select('*').eq('id', applicationId).maybeSingle()
  if (appError || !app) redirect(`/admin/payment-applications/${applicationId}`)

  const { data: existing } = await supabase.from('payment_customers').select('id').eq('application_id', applicationId).maybeSingle()
  if (existing?.id) redirect(`/admin/payment-customers/${existing.id}`)

  const { data: customer, error } = await supabase
    .from('payment_customers')
    .insert({
      application_id: applicationId,
      company_name: app.company_name,
      org_number: app.org_number,
      contact_name: app.contact_name,
      email: app.email,
      phone: app.phone,
      status: 'onboarding',
      partner_status: 'not_started',
      portal_status: 'not_invited',
    })
    .select('id')
    .single()

  if (error || !customer) redirect(`/admin/payment-applications/${applicationId}`)

  await supabase.from('payment_applications').update({ status: 'customer_created', updated_at: new Date().toISOString() }).eq('id', applicationId)
  await supabase.from('payment_application_events').insert({ application_id: applicationId, event_type: 'customer_created', description: 'Kund skapades från ansökan.', created_by: user.id })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_customer', entityId: customer.id, action: 'customer_created', newValues: customer })
  redirect(`/admin/payment-customers/${customer.id}`)
}

function toNumber(value: FormDataEntryValue | null) {
  const raw = String(value || '').replace(',', '.').trim()
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

export async function saveCustomerPricingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePricingAdmin()
  const customerId = String(formData.get('customer_id') || '')
  const reason = String(formData.get('reason') || '').trim()

  if (!customerId) return { ok: false, message: 'Kund saknas.' }
  if (reason.length < 5) return { ok: false, message: 'Skriv en kort orsak till prisändringen.' }

  const supabase = createAdminClient()
  const { data: oldPricing } = await supabase.from('payment_customer_pricing').select('*').eq('customer_id', customerId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (oldPricing?.id) {
    await supabase.from('payment_customer_pricing').update({ status: 'archived', valid_until: new Date().toISOString() }).eq('id', oldPricing.id)
  }

  const pricingPayload = {
    customer_id: customerId,
    setup_fee: toNumber(formData.get('setup_fee')),
    monthly_fee: toNumber(formData.get('monthly_fee')),
    fee_per_invoice: toNumber(formData.get('fee_per_invoice')),
    percentage_fee_per_invoice: toNumber(formData.get('percentage_fee_per_invoice')),
    minimum_monthly_fee: toNumber(formData.get('minimum_monthly_fee')),
    api_monthly_fee: toNumber(formData.get('api_monthly_fee')),
    extra_user_fee: toNumber(formData.get('extra_user_fee')),
    support_fee: toNumber(formData.get('support_fee')),
    billing_interval: String(formData.get('billing_interval') || 'monthly'),
    currency: String(formData.get('currency') || 'SEK'),
    vat_rate: toNumber(formData.get('vat_rate')) ?? 25,
    valid_from: String(formData.get('valid_from') || new Date().toISOString().slice(0, 10)),
    status: 'active',
    created_by: user.id,
  }

  const { data: pricing, error } = await supabase.from('payment_customer_pricing').insert(pricingPayload).select('*').single()
  if (error || !pricing) return { ok: false, message: 'Kunde inte spara prisprofil.' }

  await supabase.from('payment_pricing_audit_logs').insert({ customer_id: customerId, pricing_id: pricing.id, changed_by: user.id, change_type: oldPricing ? 'updated' : 'created', old_values: oldPricing ?? null, new_values: pricing, reason })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_customer_pricing', entityId: pricing.id, action: oldPricing ? 'pricing_updated' : 'pricing_created', oldValues: oldPricing, newValues: pricing })
  revalidatePath(`/admin/payment-customers/${customerId}`)
  revalidatePath(`/admin/payment-customers/${customerId}/pricing`)
  return { ok: true, message: 'Prisprofil sparad.' }
}

export async function sendPortalInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePricingAdmin()
  const customerId = String(formData.get('customer_id') || '')
  if (!customerId) return { ok: false, message: 'Kund saknas.' }

  const supabase = createAdminClient()
  const { data: customer } = await supabase.from('payment_customers').select('*').eq('id', customerId).maybeSingle()
  if (!customer?.email) return { ok: false, message: 'Kunden saknar e-post.' }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await supabase.from('portal_invites').insert({ customer_id: customerId, email: customer.email, role: 'customer_admin', token_hash: tokenHash, expires_at: expiresAt, created_by: user.id })
  if (inviteError) return { ok: false, message: 'Kunde inte skapa inbjudan.' }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const activateUrl = `${appUrl}/activate?token=${token}`
  const subject = 'Aktivera ditt konto i Div3rsa Portal'
  const html = `<p>Hej ${customer.contact_name || ''},</p><p>Ditt konto i Div3rsa Portal är skapat.</p><p><a href="${activateUrl}">Aktivera konto</a></p><p>Länken gäller i 48 timmar.</p><p>Vänliga hälsningar,<br/>Div3rsa</p>`
  const text = `Hej ${customer.contact_name || ''},\n\nDitt konto i Div3rsa Portal är skapat. Aktivera kontot här: ${activateUrl}\n\nLänken gäller i 48 timmar.\n\nDiv3rsa`
  let emailStatus = 'sent'
  let errorMessage: string | null = null
  let providerMessageId: string | null = null

  try {
    const result = await sendSmtpMail({ to: customer.email, subject, html, text })
    providerMessageId = typeof result.messageId === 'string' ? result.messageId : null
  } catch (error) {
    console.error('Portal invite SMTP error', error)
    emailStatus = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Okänt SMTP-fel.'
  }

  await supabase.from('email_logs').insert({ customer_id: customerId, email_type: 'portal_invite', recipient: customer.email, subject, status: emailStatus, provider_message_id: providerMessageId, error_message: errorMessage, sent_at: emailStatus === 'sent' ? new Date().toISOString() : null })
  await supabase.from('payment_customers').update({ portal_status: emailStatus === 'sent' ? 'invited' : 'invite_failed' }).eq('id', customerId)
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_customer', entityId: customerId, action: 'portal_invite_sent', newValues: { emailStatus, expiresAt } })

  revalidatePath(`/admin/payment-customers/${customerId}`)
  return { ok: emailStatus !== 'failed', message: emailStatus === 'sent' ? 'Portalinbjudan skickad.' : 'Inbjudan skapad, men mail kunde inte skickas.' }
}
