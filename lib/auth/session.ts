import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PortalRole = 'super_admin' | 'admin' | 'support' | 'customer_admin' | 'customer_user'

export type PortalUser = {
  id: string
  email: string
  full_name: string | null
  role: PortalRole
  customer_id: string | null
  status: string
  must_change_password: boolean
  onboarding_status: string | null
  password_changed_at: string | null
}

type RequireUserOptions = {
  allowPasswordChange?: boolean
}

export async function getSessionUser() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user?.email) return null

  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('id,email,full_name,role,customer_id,status,must_change_password,onboarding_status,password_changed_at')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!portalUser || portalUser.status !== 'active') return null

  return portalUser as PortalUser
}

export async function requireUser(options: RequireUserOptions = {}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.must_change_password && !options.allowPasswordChange) redirect('/onboarding/change-password')
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!['super_admin', 'admin', 'support'].includes(user.role)) redirect('/dashboard')
  return user
}

export async function requirePricingAdmin() {
  const user = await requireUser()
  if (!['super_admin', 'admin'].includes(user.role)) redirect('/admin')
  return user
}

export function isAdminRole(role?: string | null) {
  return role === 'super_admin' || role === 'admin' || role === 'support'
}
