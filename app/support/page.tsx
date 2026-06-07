import { CustomerSupportForm } from '@/components/support/SupportForms'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export default async function SupportPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: tickets } = user.customer_id ? await supabase.from('support_tickets').select('*').eq('customer_id', user.customer_id).order('created_at', { ascending: false }) : { data: [] }
  return (
    <PortalLayout user={user}>
      <PageHeader title="Support" description="Skicka frågor eller kompletteringar till Div3rsa." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="card p-5"><h2 className="text-xl font-black text-ink">Dina ärenden</h2><div className="mt-4 space-y-3">{tickets?.length ? tickets.map((t: any) => <div key={t.id} className="rounded-2xl border border-line bg-soft p-4"><div className="font-bold text-ink">{t.subject}</div><div className="mt-1 text-sm text-muted">{t.status} · {formatDate(t.created_at)}</div></div>) : <p className="text-muted">Inga ärenden ännu.</p>}</div></section>
        <CustomerSupportForm />
      </div>
    </PortalLayout>
  )
}
