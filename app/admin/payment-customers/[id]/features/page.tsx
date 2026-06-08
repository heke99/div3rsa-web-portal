import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FeatureAccessForm } from '@/components/admin/FeatureAccessForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePricingAdmin } from '@/lib/auth/session'
import { getCustomerFeatures } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function CustomerFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePricingAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const { data: customer } = await supabase.from('payment_customers').select('*').eq('id', id).maybeSingle()
  if (!customer) notFound()
  const features = await getCustomerFeatures(id)

  return (
    <PortalLayout user={user}>
      <PageHeader title={`Moduler för ${customer.company_name}`} eyebrow="Kundaccess" description="Styr vilka delar av portalen kunden får använda." action={<Link href={`/admin/payment-customers/${id}`} className="btn btn-secondary">Tillbaka</Link>} />
      <FeatureAccessForm customerId={id} features={features} />
    </PortalLayout>
  )
}
