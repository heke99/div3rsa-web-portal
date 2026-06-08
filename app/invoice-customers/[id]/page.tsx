import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InvoiceCustomerForm } from '@/components/invoice-customers/InvoiceCustomerForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InvoiceCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const supabase = createAdminClient()
  const { data: customer } = user.customer_id
    ? await supabase.from('invoice_customers').select('*').eq('id', id).eq('payment_customer_id', user.customer_id).maybeSingle()
    : { data: null }
  if (!customer) notFound()

  return (
    <PortalLayout user={user}>
      <PageHeader title={customer.name} eyebrow="Kund" description="Uppdatera fakturamottagarens uppgifter." action={<Link href="/invoice-customers" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceCustomerForm customer={customer} />
    </PortalLayout>
  )
}
