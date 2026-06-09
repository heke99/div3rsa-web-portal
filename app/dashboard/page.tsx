import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCustomerFeatures } from '@/lib/features'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const [customerRes, features, invoiceCount, productCount, apiLogs, failedEmails] = await Promise.all([
    user.customer_id ? supabase.from('payment_customers').select('*').eq('id', user.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    getCustomerFeatures(user.customer_id),
    user.customer_id ? supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('payment_customer_id', user.customer_id) : Promise.resolve({ count: 0 }),
    user.customer_id ? supabase.from('invoice_products').select('*', { count: 'exact', head: true }).eq('payment_customer_id', user.customer_id) : Promise.resolve({ count: 0 }),
    user.customer_id ? supabase.from('api_request_logs').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    user.customer_id ? supabase.from('invoice_email_logs').select('*', { count: 'exact', head: true }).eq('payment_customer_id', user.customer_id).eq('status', 'failed') : Promise.resolve({ count: 0 }),
  ])
  const customer = customerRes.data
  const checklist = [
    { title: 'Lägg in företags- och betalningsuppgifter', done: Boolean(customer?.company_name), href: '/settings/invoice' },
    { title: 'Skapa minst en fakturamottagare', done: false, href: '/invoice-customers' },
    { title: 'Skapa sparade artiklar', done: (productCount.count ?? 0) > 0, href: '/invoice-products' },
    { title: 'Skapa första fakturan', done: (invoiceCount.count ?? 0) > 0, href: '/invoices/new' },
    { title: 'Aktivera API/Webhooks vid behov', done: Boolean(features.api_access), href: '/api-webhooks' },
    { title: 'Öppna Accounting när Div3rsa aktiverat modulen', done: Boolean(features.accounting), href: '/accounting' },
  ]

  return (
    <PortalLayout user={user}>
      <PageHeader title="Välkommen till Div3rsa Portal" description="Här hanterar du fakturering, API, webhooks och koppling till Accounting." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard title="Fakturor" value={String(invoiceCount.count ?? 0)} />
        <StatusCard title="Artiklar" value={String(productCount.count ?? 0)} />
        <StatusCard title="API" value={features.api_access ? 'Aktivt' : 'Ej aktivt'} />
        <StatusCard title="Failed emails" value={String(failedEmails.count ?? 0)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2 mt-6">
        <section className="card p-6"><h2 className="text-xl font-black text-ink">Kom igång</h2><div className="mt-4 space-y-3">{checklist.map((item) => <Link key={item.title} href={item.href} className="flex items-center justify-between rounded-xl border border-line bg-soft px-4 py-3"><span className="font-semibold text-ink">{item.title}</span><span className={item.done ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>{item.done ? 'Klar' : 'Att göra'}</span></Link>)}</div></section>
        <section className="card p-6"><h2 className="text-xl font-black text-ink">Snabbvägar</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><Link href="/invoices/new" className="btn btn-primary">Ny faktura</Link><Link href="/invoice-products" className="btn btn-secondary">Artiklar</Link><Link href="/api-webhooks" className="btn btn-secondary">API & Webhooks</Link><Link href="/accounting" className="btn btn-secondary">Accounting</Link></div><h3 className="mt-6 font-black text-ink">Senaste API-anrop</h3><div className="mt-3 space-y-2">{(apiLogs.data ?? []).map((log: any) => <div key={log.id} className="rounded-xl bg-soft p-3 text-sm"><strong>{log.method}</strong> {log.path} · {log.status_code || '—'}</div>)}</div></section>
      </div>
    </PortalLayout>
  )
}

function StatusCard({ title, value }: { title: string; value: string }) { return <div className="card p-5"><div className="text-sm font-bold text-muted">{title}</div><div className="mt-3 text-2xl font-black text-ink">{value}</div></div> }
