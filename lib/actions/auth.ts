'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data: portalUser } = await supabase.from('portal_users').select('role,status').eq('id', userId).maybeSingle()
  if (!portalUser || portalUser.status !== 'active') {
    await supabase.auth.signOut()
    return { ok: false, message: 'Kontot är inte aktivt. Kontakta Div3rsa.' }
  }

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
