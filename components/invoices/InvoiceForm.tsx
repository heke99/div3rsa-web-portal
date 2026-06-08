'use client'

import { useMemo, useState, useActionState } from 'react'
import { saveInvoiceDraftAction } from '@/lib/actions/invoices'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function InvoiceForm({ recipients }: { recipients: any[] }) {
  const [state, action, pending] = useActionState(saveInvoiceDraftAction, initialState)
  const [selectedRecipientId, setSelectedRecipientId] = useState(recipients[0]?.id || '')
  const selectedRecipient = useMemo(() => recipients.find((item) => item.id === selectedRecipientId), [recipients, selectedRecipientId])
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <form action={action} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">Ny faktura</h2>
          <p className="mt-1 text-sm text-muted">Skapa ett utkast, kontrollera fakturan och skicka den från detaljsidan.</p>
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
          <input name="currency" className="input" defaultValue={selectedRecipient?.currency || 'SEK'} />
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
        <h3 className="text-lg font-black text-ink">Fakturarader</h3>
        <div className="mt-3 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-line bg-soft p-3 md:grid-cols-[1fr_100px_130px_100px]">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted">Beskrivning</label>
                <input name={`line_description_${index}`} className="input" placeholder={index === 0 ? 'Exempel: Månadsavgift' : ''} required={index === 0} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted">Antal</label>
                <input name={`line_quantity_${index}`} className="input" inputMode="decimal" defaultValue={index === 0 ? '1' : ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted">Pris exkl. moms</label>
                <input name={`line_unit_price_${index}`} className="input" inputMode="decimal" placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted">Moms %</label>
                <input name={`line_vat_rate_${index}`} className="input" inputMode="decimal" defaultValue={selectedRecipient?.default_vat_rate ?? 25} />
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
