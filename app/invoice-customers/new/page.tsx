import Link from 'next/link'
import { InvoiceCustomerForm } from '@/components/invoice-customers/InvoiceCustomerForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function NewInvoiceCustomerPage() {
  const user = await requireUser()
  return (
    <PortalLayout user={user}>
      <PageHeader title="Ny kund" eyebrow="Fakturering" description="Lägg till en mottagare för framtida fakturor." action={<Link href="/invoice-customers" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceCustomerForm />
    </PortalLayout>
  )
}
