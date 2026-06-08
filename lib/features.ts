import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
export { defaultFeatureKeys, featureLabels } from '@/lib/feature-definitions'

export async function getCustomerFeatures(customerId?: string | null) {
  if (!customerId) return {} as Record<string, boolean>
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_features')
    .select('feature_key,enabled')
    .eq('customer_id', customerId)

  return Object.fromEntries((data ?? []).map((row: any) => [row.feature_key, Boolean(row.enabled)])) as Record<string, boolean>
}

export function featureEnabled(features: Record<string, boolean>, key: string) {
  return features[key] === true
}
