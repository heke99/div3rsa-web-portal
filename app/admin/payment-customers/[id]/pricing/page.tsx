import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PricingForm } from '@/components/admin/PricingForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePricingAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function CustomerPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePricingAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: customer }, { data: pricing }] = await Promise.all([
    supabase.from('payment_customers').select('*').eq('id', id).maybeSingle(),
    supabase.from('payment_customer_pricing').select('*').eq('customer_id', id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!customer) notFound()
  return (
    <PortalLayout user={user}>
      <PageHeader title={`Prisprofil – ${customer.company_name}`} eyebrow="Prissättning" description="Sätt startavgift, månadsavgift och transaktionsavgifter. Alla ändringar loggas." action={<Link href={`/admin/payment-customers/${id}`} className="btn btn-secondary">Tillbaka</Link>} />
      <PricingForm customerId={id} pricing={pricing} />
    </PortalLayout>
  )
}
