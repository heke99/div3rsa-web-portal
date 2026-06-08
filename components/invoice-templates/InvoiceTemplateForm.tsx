'use client'

import { useActionState } from 'react'
import { saveInvoiceTemplateAction } from '@/lib/actions/invoice-templates'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

type InvoiceTemplateFormProps = {
  template?: any
  items?: any[]
}

export function InvoiceTemplateForm({ template, items = [] }: InvoiceTemplateFormProps) {
  const [state, action, pending] = useActionState(saveInvoiceTemplateAction, initialState)
  const rows = items.length ? items : [{ description: '', quantity: 1, unit_price: '', vat_rate: 25 }]

  return (
    <form action={action} className="card p-5">
      {template?.id ? <input type="hidden" name="id" value={template.id} /> : null}
      <div>
        <h2 className="text-xl font-black text-ink">Fakturamall</h2>
        <p className="mt-1 text-sm text-muted">Spara återanvändbara fakturarader för abonnemang, månadsavgifter och projekt.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Namn" name="name" defaultValue={template?.name} required />
        <Field label="Valuta" name="currency" defaultValue={template?.currency || 'SEK'} required />
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-ink">Beskrivning</label>
        <textarea name="description" className="input min-h-20" defaultValue={template?.description || ''} />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-black text-ink">Mallrader</h3>
        <div className="mt-3 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => {
            const item = rows[index]
            return (
              <div key={index} className="grid gap-3 rounded-2xl border border-line bg-soft p-3 md:grid-cols-[1fr_100px_130px_100px]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Beskrivning</label>
                  <input name={`line_description_${index}`} className="input" defaultValue={item?.description || ''} placeholder={index === 0 ? 'Exempel: Månadsavgift' : ''} required={index === 0} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Antal</label>
                  <input name={`line_quantity_${index}`} className="input" inputMode="decimal" defaultValue={item?.quantity ?? (index === 0 ? 1 : '')} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Pris exkl. moms</label>
                  <input name={`line_unit_price_${index}`} className="input" inputMode="decimal" defaultValue={item?.unit_price ?? ''} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Moms %</label>
                  <input name={`line_vat_rate_${index}`} className="input" inputMode="decimal" defaultValue={item?.vat_rate ?? 25} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button className="btn btn-primary mt-5" disabled={pending}>{pending ? 'Sparar…' : 'Spara fakturamall'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

function Field({ label, name, defaultValue, type = 'text', required }: { label: string; name: string; defaultValue?: any; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink">{label}</label>
      <input name={name} type={type} className="input" defaultValue={defaultValue ?? ''} required={required} />
    </div>
  )
}
