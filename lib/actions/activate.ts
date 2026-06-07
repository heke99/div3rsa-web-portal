'use server'

import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export type ActivateState = { ok: boolean; message: string }

export async function activateAccountAction(_prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const token = String(formData.get('token') || '')
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')

  if (!token) return { ok: false, message: 'Aktiveringslänk saknas.' }
  if (password.length < 8) return { ok: false, message: 'Lösenordet måste vara minst 8 tecken.' }
  if (password !== confirmPassword) return { ok: false, message: 'Lösenorden matchar inte.' }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const supabase = createAdminClient()
  const { data: invite } = await supabase.from('portal_invites').select('*, payment_customers(*)').eq('token_hash', tokenHash).maybeSingle()

  if (!invite || invite.used_at) return { ok: false, message: 'Länken är ogiltig eller redan använd.' }
  if (new Date(invite.expires_at).getTime() < Date.now()) return { ok: false, message: 'Länken har gått ut. Kontakta Div3rsa för en ny inbjudan.' }

  const customer = Array.isArray(invite.payment_customers) ? invite.payment_customers[0] : invite.payment_customers
  const email = invite.email
  const fullName = customer?.contact_name || email

  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const existing = existingUser.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  let authUserId = existing?.id
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
    if (error) return { ok: false, message: 'Kunde inte aktivera befintligt konto.' }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) return { ok: false, message: 'Kunde inte skapa användarkonto.' }
    authUserId = data.user.id
  }

  if (!authUserId) return { ok: false, message: 'Kunde inte skapa användaren.' }

  await supabase.from('portal_users').upsert({ id: authUserId, email, full_name: fullName, role: invite.role, customer_id: invite.customer_id, status: 'active', must_change_password: false }, { onConflict: 'id' })
  await supabase.from('portal_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id)
  await supabase.from('payment_customers').update({ portal_status: 'active', activated_at: new Date().toISOString() }).eq('id', invite.customer_id)
  await supabase.from('audit_logs').insert({ actor_user_id: authUserId, actor_role: invite.role, entity_type: 'payment_customer', entity_id: invite.customer_id, action: 'portal_invite_used', new_values: { invite_id: invite.id } })

  redirect('/login')
}
