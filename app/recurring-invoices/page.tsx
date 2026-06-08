import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function RecurringInvoicesPage() {
  const user = await requireUser()
  return <PortalLayout user={user}><PageHeader title="Återkommande fakturor" eyebrow="Fakturering" description="Återkommande fakturor byggs i nästa batch. Första versionen skapar fakturautkast innan auto-send aktiveras." /><section className="card p-6 text-muted">Här kommer månadsvisa, kvartalsvisa och anpassade fakturascheman.</section></PortalLayout>
}
