import { AdminReplyForm } from '@/components/support/SupportForms'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function AdminSupportPage() {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { data: tickets } = await supabase.from('support_tickets').select('*, payment_customers(company_name,email)').order('created_at', { ascending: false }).limit(50)

  return (
    <PortalLayout user={user}>
      <PageHeader title="Support" eyebrow="Admin" description="Hantera supportärenden från kunder." />
      <div className="space-y-4">
        {tickets?.length ? tickets.map((ticket: any) => (
          <section key={ticket.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-black text-ink">{ticket.subject}</h2><p className="mt-1 text-sm text-muted">{ticket.payment_customers?.company_name || 'Kund'} · {ticket.status} · {formatDate(ticket.created_at)}</p></div>
            </div>
            <AdminReplyForm ticketId={ticket.id} />
          </section>
        )) : <div className="card p-6 text-center text-muted">Inga supportärenden ännu.</div>}
      </div>
    </PortalLayout>
  )
}
