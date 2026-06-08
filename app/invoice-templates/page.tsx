import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InvoiceTemplatesPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: templates } = user.customer_id
    ? await supabase
      .from('invoice_templates')
      .select('*, invoice_template_items(id)')
      .eq('payment_customer_id', user.customer_id)
      .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader
        title="Fakturamallar"
        eyebrow="Fakturering"
        description="Spara återanvändbara upplägg för abonnemang, månadsavgifter och standardfakturor."
        action={<Link href="/invoice-templates/new" className="btn btn-primary">Ny fakturamall</Link>}
      />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Mall</th><th>Valuta</th><th>Rader</th><th>Skapad</th><th></th></tr></thead>
          <tbody>
            {(templates ?? []).map((template: any) => (
              <tr key={template.id}>
                <td><div className="font-bold">{template.name}</div><div className="text-sm text-muted">{template.description || 'Ingen beskrivning'}</div></td>
                <td>{template.currency || 'SEK'}</td>
                <td>{template.invoice_template_items?.length || 0}</td>
                <td className="text-sm text-muted">{new Date(template.created_at).toLocaleDateString('sv-SE')}</td>
                <td><Link className="font-bold text-brand" href={`/invoice-templates/${template.id}`}>Öppna</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates?.length === 0 ? <div className="p-6 text-center text-muted">Inga fakturamallar ännu.</div> : null}
      </div>
    </PortalLayout>
  )
}
