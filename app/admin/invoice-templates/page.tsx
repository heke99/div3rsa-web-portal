import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminInvoiceTemplatesPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: templates } = await supabase
    .from('invoice_templates')
    .select('*, payment_customers(company_name), invoice_template_items(id)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <PortalLayout user={user}>
      <PageHeader title="Fakturamallar" eyebrow="Admin" description="Översikt över kundernas fakturamallar." />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Mall</th><th>Kundbolag</th><th>Valuta</th><th>Rader</th><th>Skapad</th></tr></thead>
          <tbody>
            {(templates ?? []).map((template: any) => (
              <tr key={template.id}>
                <td><div className="font-bold">{template.name}</div><div className="text-sm text-muted">{template.description || '—'}</div></td>
                <td>{template.payment_customers?.company_name || '—'}</td>
                <td>{template.currency || 'SEK'}</td>
                <td>{template.invoice_template_items?.length || 0}</td>
                <td className="text-sm text-muted">{new Date(template.created_at).toLocaleDateString('sv-SE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates?.length === 0 ? <div className="p-6 text-center text-muted">Inga fakturamallar ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}
