'use client'

import { useMemo, useState, useActionState } from 'react'
import { saveInvoiceDraftAction } from '@/lib/actions/invoices'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

type LineState = {
  productId: string
  customName: string
  description: string
  sku: string
  unit: string
  quantity: string
  unitPrice: string
  vatRate: string
  saveProduct: boolean
}

function emptyLine(vatRate = 25): LineState {
  return { productId: '', customName: '', description: '', sku: '', unit: 'st', quantity: '1', unitPrice: '', vatRate: String(vatRate), saveProduct: false }
}

export function InvoiceForm({ recipients, products, settings }: { recipients: any[]; products?: any[]; settings?: any }) {
  const [state, action, pending] = useActionState(saveInvoiceDraftAction, initialState)
  const [selectedRecipientId, setSelectedRecipientId] = useState(recipients[0]?.id || '')
  const selectedRecipient = useMemo(() => recipients.find((item) => item.id === selectedRecipientId), [recipients, selectedRecipientId])
  const defaultVat = Number(settings?.default_vat_rate ?? selectedRecipient?.default_vat_rate ?? 25)
  const [lines, setLines] = useState<LineState[]>(Array.from({ length: 5 }, (_, index) => ({ ...emptyLine(defaultVat), description: index === 0 ? '' : '', quantity: index === 0 ? '1' : '' })))
  const today = new Date().toISOString().slice(0, 10)
  const paymentTermsDays = Number(settings?.default_payment_terms_days ?? selectedRecipient?.default_payment_terms_days ?? 30)
  const due = new Date(Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((current) => current.map((line, rowIndex) => rowIndex === index ? { ...line, ...patch } : line))
  }

  function chooseProduct(index: number, productId: string) {
    const product = products?.find((item) => item.id === productId)
    if (!product) {
      updateLine(index, { productId: '', customName: '', description: '', sku: '', unit: 'st', unitPrice: '', vatRate: String(defaultVat), saveProduct: false })
      return
    }
    updateLine(index, {
      productId: product.id,
      customName: product.name || '',
      description: product.description || product.name || '',
      sku: product.sku || '',
      unit: product.unit || 'st',
      unitPrice: String(product.unit_price ?? ''),
      vatRate: String(product.vat_rate ?? defaultVat),
      saveProduct: false,
    })
  }

  function useCustom(index: number) {
    updateLine(index, { productId: '', customName: '', description: '', sku: '', unit: 'st', unitPrice: '', vatRate: String(defaultVat), saveProduct: true })
  }

  return (
    <form action={action} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">Ny faktura</h2>
          <p className="mt-1 text-sm text-muted">Välj sparad artikel eller lägg till egen artikel och spara den för framtiden.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Fakturamottagare</label>
          <select name="invoice_customer_id" className="input" value={selectedRecipientId} onChange={(event) => setSelectedRecipientId(event.target.value)} required>
            <option value="">Välj kund</option>
            {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
          </select>
          {selectedRecipient ? <p className="mt-2 text-xs text-muted">{selectedRecipient.email} · {selectedRecipient.organization_number || 'orgnr saknas'}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Valuta</label>
          <input name="currency" className="input" defaultValue={settings?.default_currency || selectedRecipient?.currency || 'SEK'} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Fakturadatum</label>
          <input name="issue_date" type="date" className="input" defaultValue={today} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Förfallodatum</label>
          <input name="due_date" type="date" className="input" defaultValue={due} required />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-ink">Fakturarader</h3>
          <a href="/invoice-products" className="text-sm font-bold text-brand">Hantera artiklar</a>
        </div>
        <div className="mt-3 space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="rounded-2xl border border-line bg-soft p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Välj sparad artikel</label>
                  <select name={`line_product_id_${index}`} className="input" value={line.productId} onChange={(event) => chooseProduct(index, event.target.value)}>
                    <option value="">Annat / egen artikel</option>
                    {(products ?? []).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.unit_price} {product.currency}</option>)}
                  </select>
                </div>
                <button type="button" className="btn btn-secondary self-end" onClick={() => useCustom(index)}>Lägg till egen</button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_90px_90px_120px_90px]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Artikelnamn</label>
                  <input name={`line_custom_name_${index}`} className="input" value={line.customName} onChange={(event) => updateLine(index, { customName: event.target.value })} required={index === 0} placeholder={index === 0 ? 'Exempel: Månadsavgift' : ''} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Beskrivning</label>
                  <input name={`line_description_${index}`} className="input" value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">SKU</label>
                  <input name={`line_sku_${index}`} className="input" value={line.sku} onChange={(event) => updateLine(index, { sku: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Enhet</label>
                  <input name={`line_unit_${index}`} className="input" value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Antal</label>
                  <input name={`line_quantity_${index}`} className="input" inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Moms %</label>
                  <input name={`line_vat_rate_${index}`} className="input" inputMode="decimal" value={line.vatRate} onChange={(event) => updateLine(index, { vatRate: event.target.value })} />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Pris exkl. moms</label>
                  <input name={`line_unit_price_${index}`} className="input" inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} placeholder="0" />
                </div>
                {!line.productId ? <label className="flex items-center gap-2 self-end text-sm font-bold text-ink"><input type="checkbox" name={`line_save_product_${index}`} checked={line.saveProduct} onChange={(event) => updateLine(index, { saveProduct: event.target.checked })} /> Spara som artikel för framtida fakturor</label> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary mt-5" disabled={pending || !recipients.length}>{pending ? 'Skapar…' : 'Spara fakturautkast'}</button>
      {!recipients.length ? <p className="mt-3 text-sm font-semibold text-rose-700">Lägg till en kund innan du skapar faktura.</p> : null}
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
