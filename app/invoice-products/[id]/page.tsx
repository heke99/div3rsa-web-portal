import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InvoiceProductForm } from '@/components/invoice-products/InvoiceProductForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InvoiceProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const supabase = createAdminClient()
  const { data: product } = user.customer_id
    ? await supabase.from('invoice_products').select('*').eq('id', id).eq('payment_customer_id', user.customer_id).maybeSingle()
    : { data: null }
  if (!product) notFound()

  return (
    <PortalLayout user={user}>
      <PageHeader title={product.name} eyebrow="Artikel" description="Redigera artikeldata. Gamla fakturor påverkas inte eftersom fakturarader sparar snapshot." action={<Link href="/invoice-products" className="btn btn-secondary">Tillbaka</Link>} />
      <InvoiceProductForm product={product} />
    </PortalLayout>
  )
}
