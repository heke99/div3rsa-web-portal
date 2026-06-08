import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function InvoiceTemplatesPage() {
  const user = await requireUser()
  return <PortalLayout user={user}><PageHeader title="Fakturamallar" eyebrow="Fakturering" description="Fakturamallar byggs i nästa batch ovanpå fakturamotorn." /><section className="card p-6 text-muted">Här kommer mallar för återanvändbara fakturarader och standardupplägg.</section></PortalLayout>
}
