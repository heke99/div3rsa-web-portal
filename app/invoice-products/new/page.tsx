import Link from 'next/link'
import { InvoiceProductForm } from '@/components/invoice-products/InvoiceProductForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function NewInvoiceProductPage() {
  const user = await requireUser()
  return (
    <PortalLayout user={user}>
      <PageHeader title="Ny artikel" eyebrow="Fakturering" description="Skapa en produkt eller tjänst som kan återanvändas på fakturor." action={<Link href="/invoice-products" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceProductForm />
    </PortalLayout>
  )
}
