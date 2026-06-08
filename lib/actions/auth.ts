'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthState = { ok: boolean; message: string }

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')

  if (!email || !password) return { ok: false, message: 'Fyll i e-post och lösenord.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { ok: false, message: 'Fel e-post eller lösenord.' }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return { ok: false, message: 'Kunde inte läsa användaren.' }

  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('role,status,must_change_password')
    .eq('id', userId)
    .maybeSingle()

  if (!portalUser || portalUser.status !== 'active') {
    await supabase.auth.signOut()
    return { ok: false, message: 'Kontot är inte aktivt. Kontakta Div3rsa.' }
  }

  if (portalUser.must_change_password) redirect('/onboarding/change-password')
  if (['super_admin', 'admin', 'support'].includes(portalUser.role)) redirect('/admin')
  redirect('/dashboard')
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!email) return { ok: false, message: 'Skriv din e-postadress.' }

  const supabase = await createClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) return { ok: false, message: 'Kunde inte skicka återställningslänk.' }
  return { ok: true, message: 'Om kontot finns skickas en återställningslänk.' }
}

export async function changeInitialPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')

  if (password.length < 10) return { ok: false, message: 'Lösenordet måste vara minst 10 tecken.' }
  if (password !== confirmPassword) return { ok: false, message: 'Lösenorden matchar inte.' }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData.user
  if (!authUser) return { ok: false, message: 'Du behöver vara inloggad för att byta lösenord.' }

  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('id,email,role,status,must_change_password,customer_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!portalUser || portalUser.status !== 'active') return { ok: false, message: 'Kontot är inte aktivt.' }

  const { error: passwordError } = await supabase.auth.updateUser({ password })
  if (passwordError) return { ok: false, message: 'Kunde inte byta lösenord. Försök igen.' }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  await admin
    .from('portal_users')
    .update({
      must_change_password: false,
      onboarding_status: 'active',
      password_changed_at: now,
      updated_at: now,
    })
    .eq('id', authUser.id)

  await admin.from('audit_logs').insert({
    actor_user_id: authUser.id,
    actor_role: portalUser.role,
    entity_type: 'portal_user',
    entity_id: authUser.id,
    action: 'password_changed_by_customer',
    new_values: { customer_id: portalUser.customer_id },
  })

  if (['super_admin', 'admin', 'support'].includes(portalUser.role)) redirect('/admin')
  redirect('/dashboard')
}
