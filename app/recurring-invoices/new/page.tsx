import Link from 'next/link'
import { RecurringInvoiceForm } from '@/components/recurring-invoices/RecurringInvoiceForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function NewRecurringInvoicePage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: recipients } = user.customer_id
    ? await supabase.from('invoice_customers').select('*').eq('payment_customer_id', user.customer_id).order('name')
    : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader title="Ny återkommande faktura" eyebrow="Fakturering" description="Skapa schema som producerar fakturautkast enligt intervall." action={<Link href="/recurring-invoices" className="btn btn-secondary">Tillbaka</Link>} />
      <RecurringInvoiceForm recipients={recipients ?? []} />
    </PortalLayout>
  )
}
