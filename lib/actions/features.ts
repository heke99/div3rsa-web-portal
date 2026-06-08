'use server'

import { revalidatePath } from 'next/cache'
import { requirePricingAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { defaultFeatureKeys } from '@/lib/features'
import type { ActionState } from '@/lib/actions/applications'

export async function saveCustomerFeaturesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePricingAdmin()
  const customerId = String(formData.get('customer_id') || '')
  if (!customerId) return { ok: false, message: 'Kund saknas.' }

  const supabase = createAdminClient()
  const { data: customer } = await supabase.from('payment_customers').select('id').eq('id', customerId).maybeSingle()
  if (!customer) return { ok: false, message: 'Kunden finns inte.' }

  const selected = new Set(formData.getAll('features').map((value) => String(value)))
  const now = new Date().toISOString()

  for (const featureKey of defaultFeatureKeys) {
    const enabled = selected.has(featureKey)
    const { data: current } = await supabase
      .from('company_features')
      .select('id,enabled')
      .eq('customer_id', customerId)
      .eq('feature_key', featureKey)
      .maybeSingle()

    if (current?.id) {
      await supabase
        .from('company_features')
        .update({ enabled, enabled_by: enabled ? user.id : null, enabled_at: enabled ? now : null, disabled_at: enabled ? null : now, updated_at: now })
        .eq('id', current.id)
    } else {
      await supabase.from('company_features').insert({
        customer_id: customerId,
        feature_key: featureKey,
        enabled,
        enabled_by: enabled ? user.id : null,
        enabled_at: enabled ? now : null,
        disabled_at: enabled ? null : now,
      })
    }
  }

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'payment_customer',
    entity_id: customerId,
    action: 'features_updated',
    new_values: { enabled: Array.from(selected) },
  })

  revalidatePath(`/admin/payment-customers/${customerId}`)
  revalidatePath(`/admin/payment-customers/${customerId}/features`)
  return { ok: true, message: 'Moduler uppdaterade.' }
}
