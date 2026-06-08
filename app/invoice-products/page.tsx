import Link from 'next/link'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function InvoiceProductsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser()
  const params = await searchParams
  const q = typeof params?.q === 'string' ? params.q.trim() : ''
  const status = typeof params?.status === 'string' ? params.status : ''
  const supabase = createAdminClient()
  let query = user.customer_id
    ? supabase.from('invoice_products').select('*').eq('payment_customer_id', user.customer_id).order('created_at', { ascending: false }).limit(200)
    : null
  if (query && q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`)
  if (query && status === 'active') query = query.eq('is_active', true)
  if (query && status === 'inactive') query = query.eq('is_active', false)
  const { data: products } = query ? await query : { data: [] }

  return (
    <PortalLayout user={user}>
      <PageHeader title="Artiklar" eyebrow="Fakturering" description="Spara produkter och tjänster som kan väljas direkt på fakturor." action={<Link href="/invoice-products/new" className="btn btn-primary">Ny artikel</Link>} />
      <form className="card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="input" name="q" defaultValue={q} placeholder="Sök namn, SKU eller beskrivning" />
        <select className="input" name="status" defaultValue={status}>
          <option value="">Alla artiklar</option>
          <option value="active">Aktiva</option>
          <option value="inactive">Inaktiva</option>
        </select>
        <button className="btn btn-primary">Filtrera</button>
      </form>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Artikel</th><th>Enhet</th><th>Pris</th><th>Moms</th><th>Status</th><th>Skapad</th><th></th></tr></thead>
          <tbody>{(products ?? []).map((product: any) => (
            <tr key={product.id}>
              <td><div className="font-bold">{product.name}</div><div className="text-sm text-muted">{product.sku || 'SKU saknas'}</div></td>
              <td>{product.unit || 'st'}</td>
              <td>{formatCurrency(product.unit_price, product.currency || 'SEK')}</td>
              <td>{Number(product.vat_rate ?? 0).toLocaleString('sv-SE')}%</td>
              <td><StatusBadge value={product.is_active ? 'active' : 'inactive'} /></td>
              <td>{formatDate(product.created_at)}</td>
              <td><Link className="font-bold text-brand" href={`/invoice-products/${product.id}`}>Öppna</Link></td>
            </tr>
          ))}</tbody>
        </table>
        {products?.length === 0 ? <div className="p-6 text-center text-muted">Inga artiklar hittades.</div> : null}
      </div>
    </PortalLayout>
  )
}
