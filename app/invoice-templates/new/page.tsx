import Link from 'next/link'
import { InvoiceTemplateForm } from '@/components/invoice-templates/InvoiceTemplateForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function NewInvoiceTemplatePage() {
  const user = await requireUser()
  return (
    <PortalLayout user={user}>
      <PageHeader title="Ny fakturamall" eyebrow="Fakturering" description="Skapa en mall som kan användas för nya fakturautkast." action={<Link href="/invoice-templates" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceTemplateForm />
    </PortalLayout>
  )
}
