'use client'

import { useActionState } from 'react'
import { saveInvoiceProductAction } from '@/lib/actions/invoice-products'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function InvoiceProductForm({ product }: { product?: any }) {
  const [state, action, pending] = useActionState(saveInvoiceProductAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="id" value={product?.id || ''} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">{product?.id ? 'Redigera artikel' : 'Ny artikel'}</h2>
          <p className="mt-1 text-sm text-muted">Spara återkommande produkter och tjänster för snabb fakturering.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" name="is_active" defaultChecked={product?.is_active !== false} /> Aktiv
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Artikelnamn" name="name" defaultValue={product?.name} required />
        <Field label="SKU / artikelnummer" name="sku" defaultValue={product?.sku} />
        <Field label="Enhet" name="unit" defaultValue={product?.unit || 'st'} placeholder="st, tim, mån, projekt" />
        <Field label="Valuta" name="currency" defaultValue={product?.currency || 'SEK'} />
        <Field label="Pris exkl. moms" name="unit_price" defaultValue={product?.unit_price ?? 0} inputMode="decimal" />
        <Field label="Moms %" name="vat_rate" defaultValue={product?.vat_rate ?? 25} inputMode="decimal" />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-ink">Beskrivning</label>
        <textarea name="description" className="input min-h-28" defaultValue={product?.description || ''} />
      </div>

      <button className="btn btn-primary mt-5" disabled={pending}>{pending ? 'Sparar…' : 'Spara artikel'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

function Field({ label, name, defaultValue, required, placeholder, inputMode }: { label: string; name: string; defaultValue?: any; required?: boolean; placeholder?: string; inputMode?: 'decimal' | 'numeric' | 'text' }) {
  return <div><label className="mb-2 block text-sm font-bold text-ink">{label}</label><input name={name} className="input" defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} inputMode={inputMode} /></div>
}
