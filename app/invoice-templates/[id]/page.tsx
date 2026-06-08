import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreateInvoiceFromTemplateForm, DeleteInvoiceTemplateForm } from '@/components/invoice-templates/TemplateActions'
import { InvoiceTemplateForm } from '@/components/invoice-templates/InvoiceTemplateForm'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InvoiceTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: template }, { data: recipients }] = await Promise.all([
    user.customer_id ? supabase.from('invoice_templates').select('*').eq('id', id).eq('payment_customer_id', user.customer_id).maybeSingle() : Promise.resolve({ data: null } as any),
    user.customer_id ? supabase.from('invoice_customers').select('*').eq('payment_customer_id', user.customer_id).order('name') : Promise.resolve({ data: [] } as any),
  ])
  if (!template) notFound()
  const { data: items } = await supabase.from('invoice_template_items').select('*').eq('template_id', id).order('sort_order')

  return (
    <PortalLayout user={user}>
      <PageHeader title={template.name} eyebrow="Fakturamall" description="Redigera mallen eller skapa ett nytt fakturautkast från den." action={<Link href="/invoice-templates" className="btn btn-secondary">Tillbaka</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <InvoiceTemplateForm template={template} items={items ?? []} />
        <aside className="space-y-5">
          <CreateInvoiceFromTemplateForm templateId={template.id} recipients={recipients ?? []} />
          <DeleteInvoiceTemplateForm templateId={template.id} />
        </aside>
      </div>
    </PortalLayout>
  )
}
