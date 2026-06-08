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
  const [{ data: recipients }, { data: products }, { data: settings }] = user.customer_id ? await Promise.all([
    supabase.from('invoice_customers').select('*').eq('payment_customer_id', user.customer_id).order('name'),
    supabase.from('invoice_products').select('*').eq('payment_customer_id', user.customer_id).eq('is_active', true).order('name'),
    supabase.from('invoice_settings').select('*').eq('payment_customer_id', user.customer_id).maybeSingle(),
  ]) : [{ data: [] }, { data: [] }, { data: null }]

  return (
    <PortalLayout user={user}>
      <PageHeader title="Ny faktura" eyebrow="Fakturering" description="Skapa fakturautkast med sparade artiklar eller egen artikel." action={<Link href="/invoices" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceForm recipients={recipients ?? []} products={products ?? []} settings={settings} />
    </PortalLayout>
  )
}
