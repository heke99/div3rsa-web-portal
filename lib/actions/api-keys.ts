'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { createPlainApiKey, hashApiKey } from '@/lib/api/auth'
import { apiScopes } from '@/lib/api/scopes'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'
import type { ActionState } from '@/lib/actions/applications'

export type ApiKeyActionState = ActionState & { plainKey?: string }

function str(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

export async function createApiKeyAction(_prev: ApiKeyActionState, formData: FormData): Promise<ApiKeyActionState> {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  const features = await getCustomerFeatures(user.customer_id)
  if (!featureEnabled(features, 'api_access')) return { ok: false, message: 'API kräver aktivering av Div3rsa.' }

  const name = str(formData, 'name') || 'API-nyckel'
  const selectedScopes = apiScopes.filter((scope) => formData.get(`scope_${scope}`) === 'on')
  if (!selectedScopes.length) return { ok: false, message: 'Välj minst en scope.' }

  const plainKey = createPlainApiKey()
  const keyHash = hashApiKey(plainKey)
  const keyPrefix = plainKey.slice(0, 18)
  const keyTail = plainKey.slice(-6)
  const supabase = createAdminClient()
  const { error } = await supabase.from('api_keys').insert({
    payment_customer_id: user.customer_id,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    key_tail: keyTail,
    scopes: selectedScopes,
    status: 'active',
    created_by: user.id,
  })

  if (error) return { ok: false, message: 'Kunde inte skapa API-nyckeln.' }
  await supabase.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.role, entity_type: 'api_key', entity_id: user.customer_id, action: 'api_key_created', new_values: { name, scopes: selectedScopes } })
  revalidatePath('/api-webhooks')
  return { ok: true, message: 'API-nyckeln skapades. Kopiera den nu, den visas bara en gång.', plainKey }
}

export async function revokeApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  const id = str(formData, 'api_key_id')
  if (!id) return { ok: false, message: 'API-nyckel saknas.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('api_keys').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', id).eq('payment_customer_id', user.customer_id)
  if (error) return { ok: false, message: 'Kunde inte återkalla API-nyckeln.' }
  await supabase.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.role, entity_type: 'api_key', entity_id: id, action: 'api_key_revoked' })
  revalidatePath('/api-webhooks')
  return { ok: true, message: 'API-nyckeln återkallades.' }
}
