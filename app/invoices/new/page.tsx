import Link from 'next/link'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: recipients } = user.customer_id
    ? await supabase.from('invoice_customers').select('*').eq('payment_customer_id', user.customer_id).order('name')
    : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader title="Ny faktura" eyebrow="Fakturering" description="Skapa fakturautkast och skicka via SMTP från portalen." action={<Link href="/invoices" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceForm recipients={recipients ?? []} />
    </PortalLayout>
  )
}
