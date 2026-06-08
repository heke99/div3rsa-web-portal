'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requirePricingAdmin } from '@/lib/auth/session'
import { applicationStatuses } from '@/lib/data/status'

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


async function findAuthUserIdByEmail(email: string) {
  const supabase = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()
  const { data: portalUser } = await supabase.from('portal_users').select('id').eq('email', normalizedEmail).maybeSingle()
  if (portalUser?.id) return portalUser.id as string

  const { data } = await supabase.auth.admin.listUsers()
  return data.users.find((authUser) => authUser.email?.toLowerCase() === normalizedEmail)?.id ?? null
}

export async function setPortalAccessPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePricingAdmin()
  const customerId = String(formData.get('customer_id') || '')
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const fullName = String(formData.get('full_name') || '').trim()
  const role = String(formData.get('role') || 'customer_admin')
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')

  if (!customerId) return { ok: false, message: 'Kund saknas.' }
  if (!email) return { ok: false, message: 'Ange kundens e-post.' }
  if (!['customer_admin', 'customer_user'].includes(role)) return { ok: false, message: 'Ogiltig roll.' }
  if (password.length < 10) return { ok: false, message: 'Lösenordet måste vara minst 10 tecken.' }
  if (password !== confirmPassword) return { ok: false, message: 'Lösenorden matchar inte.' }

  const supabase = createAdminClient()
  const { data: customer } = await supabase.from('payment_customers').select('id,company_name,contact_name,email').eq('id', customerId).maybeSingle()
  if (!customer) return { ok: false, message: 'Kunden kunde inte hittas.' }

  const displayName = fullName || customer.contact_name || email
  const now = new Date().toISOString()
  let authUserId = await findAuthUserIdByEmail(email)
  let authAction: 'created' | 'password_updated' = 'created'

  if (authUserId) {
    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { payment_customer_id: customerId, role },
    })
    if (error) return { ok: false, message: `Kunde inte sätta nytt lösenord: ${error.message}` }
    authAction = 'password_updated'
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { payment_customer_id: customerId, role },
    })
    if (error || !data.user) return { ok: false, message: `Kunde inte skapa portaluser: ${error?.message ?? 'Okänt fel'}` }
    authUserId = data.user.id
  }

  const { error: portalError } = await supabase.from('portal_users').upsert({
    id: authUserId,
    email,
    full_name: displayName,
    role,
    customer_id: customerId,
    status: 'active',
    must_change_password: true,
    onboarding_status: 'pending_password_change',
    password_changed_at: null,
    manual_password_set_at: now,
    manual_password_set_by: user.id,
    disabled_at: null,
    updated_at: now,
  }, { onConflict: 'id' })

  if (portalError) return { ok: false, message: `Auth-user skapades, men portalprofilen kunde inte sparas: ${portalError.message}` }

  await supabase.from('payment_customers').update({ portal_status: 'pending_password_change', updated_at: now }).eq('id', customerId)
  await logAudit({
    actorUserId: user.id,
    actorRole: user.role,
    entityType: 'payment_customer',
    entityId: customerId,
    action: authAction === 'created' ? 'portal_access_created_manual_password' : 'portal_password_reset_by_admin',
    newValues: { auth_user_id: authUserId, email, role, must_change_password: true },
  })

  revalidatePath(`/admin/payment-customers/${customerId}`)
  revalidatePath('/admin/payment-customers')
  return { ok: true, message: authAction === 'created' ? 'Portalåtkomst skapad. Ge lösenordet till kunden manuellt.' : 'Nytt lösenord satt. Ge lösenordet till kunden manuellt.' }
}

export async function disablePortalAccessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePricingAdmin()
  const customerId = String(formData.get('customer_id') || '')
  const portalUserId = String(formData.get('portal_user_id') || '')

  if (!customerId || !portalUserId) return { ok: false, message: 'Kund eller portaluser saknas.' }

  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('portal_users')
    .update({ status: 'inactive', onboarding_status: 'disabled', disabled_at: now, updated_at: now })
    .eq('id', portalUserId)
    .eq('customer_id', customerId)

  if (error) return { ok: false, message: 'Kunde inte inaktivera portalåtkomst.' }

  await supabase.auth.admin.updateUserById(portalUserId, { ban_duration: '876000h' })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'portal_user', entityId: portalUserId, action: 'portal_access_disabled', newValues: { customerId } })
  revalidatePath(`/admin/payment-customers/${customerId}`)
  return { ok: true, message: 'Portalåtkomst inaktiverad.' }
}

export async function archiveApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  const id = String(formData.get('application_id') || '')
  if (!id) return { ok: false, message: 'Ansökan saknas.' }
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('payment_applications').update({ archived_at: now, archived_by: user.id, updated_at: now }).eq('id', id).is('deleted_at', null)
  if (error) return { ok: false, message: 'Kunde inte arkivera ansökan.' }
  await supabase.from('payment_application_events').insert({ application_id: id, event_type: 'archived', description: 'Ansökan arkiverades.', created_by: user.id })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_application', entityId: id, action: 'application_archived' })
  revalidatePath('/admin/payment-applications')
  revalidatePath(`/admin/payment-applications/${id}`)
  return { ok: true, message: 'Ansökan arkiverades.' }
}

export async function restoreApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  const id = String(formData.get('application_id') || '')
  if (!id) return { ok: false, message: 'Ansökan saknas.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('payment_applications').update({ archived_at: null, archived_by: null, updated_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null)
  if (error) return { ok: false, message: 'Kunde inte återställa ansökan.' }
  await supabase.from('payment_application_events').insert({ application_id: id, event_type: 'restored', description: 'Ansökan återställdes från arkiv.', created_by: user.id })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_application', entityId: id, action: 'application_restored' })
  revalidatePath('/admin/payment-applications')
  revalidatePath(`/admin/payment-applications/${id}`)
  return { ok: true, message: 'Ansökan återställdes.' }
}

export async function deleteApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePricingAdmin()
  if (user.role !== 'super_admin') return { ok: false, message: 'Endast superadmin kan radera ansökningar.' }
  const id = String(formData.get('application_id') || '')
  const reason = String(formData.get('delete_reason') || '').trim()
  if (!id) return { ok: false, message: 'Ansökan saknas.' }
  if (reason.length < 5) return { ok: false, message: 'Ange raderingsorsak.' }
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('payment_applications').update({ deleted_at: now, deleted_by: user.id, delete_reason: reason, updated_at: now }).eq('id', id)
  if (error) return { ok: false, message: 'Kunde inte radera ansökan.' }
  await supabase.from('payment_application_events').insert({ application_id: id, event_type: 'deleted', description: `Ansökan raderades: ${reason}`, created_by: user.id })
  await logAudit({ actorUserId: user.id, actorRole: user.role, entityType: 'payment_application', entityId: id, action: 'application_deleted', newValues: { reason } })
  revalidatePath('/admin/payment-applications')
  revalidatePath(`/admin/payment-applications/${id}`)
  return { ok: true, message: 'Ansökan raderades från standardvyer.' }
}
