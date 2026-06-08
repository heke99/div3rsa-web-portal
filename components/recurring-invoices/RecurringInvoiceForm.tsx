'use client'

import { useActionState } from 'react'
import { saveRecurringInvoiceAction } from '@/lib/actions/recurring-invoices'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

type RecurringInvoiceFormProps = {
  schedule?: any
  items?: any[]
  recipients: any[]
}

export function RecurringInvoiceForm({ schedule, items = [], recipients }: RecurringInvoiceFormProps) {
  const [state, action, pending] = useActionState(saveRecurringInvoiceAction, initialState)
  const today = new Date().toISOString().slice(0, 10)
  const rows = items.length ? items : [{ description: '', quantity: 1, unit_price: '', vat_rate: 25 }]

  return (
    <form action={action} className="card p-5">
      {schedule?.id ? <input type="hidden" name="id" value={schedule.id} /> : null}
      <div>
        <h2 className="text-xl font-black text-ink">Återkommande faktura</h2>
        <p className="mt-1 text-sm text-muted">Första versionen skapar fakturautkast. Autoskick kan aktiveras senare.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Namn" name="title" defaultValue={schedule?.title} required />
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Kund</label>
          <select name="invoice_customer_id" className="input" defaultValue={schedule?.invoice_customer_id || ''} required>
            <option value="">Välj kund</option>
            {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Frekvens</label>
          <select name="frequency" className="input" defaultValue={schedule?.frequency || 'monthly'}>
            <option value="monthly">Månadsvis</option>
            <option value="quarterly">Kvartalsvis</option>
            <option value="yearly">Årsvis</option>
            <option value="custom">Anpassad</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Status</label>
          <select name="status" className="input" defaultValue={schedule?.status || 'active'}>
            <option value="active">Aktiv</option>
            <option value="paused">Pausad</option>
            <option value="ended">Avslutad</option>
          </select>
        </div>
        <Field label="Startdatum" name="start_date" type="date" defaultValue={schedule?.start_date || today} required />
        <Field label="Nästa utkastdatum" name="next_run_date" type="date" defaultValue={schedule?.next_run_date || schedule?.start_date || today} required />
        <Field label="Slutdatum" name="end_date" type="date" defaultValue={schedule?.end_date} />
        <Field label="Betalningsvillkor dagar" name="payment_terms_days" type="number" defaultValue={schedule?.payment_terms_days ?? 30} required />
        <Field label="Valuta" name="currency" defaultValue={schedule?.currency || 'SEK'} required />
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-soft px-4 py-3 text-sm font-bold text-ink">
          <input name="auto_send" type="checkbox" defaultChecked={Boolean(schedule?.auto_send)} disabled />
          Autoskick är låst i första versionen. Utkast skapas först.
        </label>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-black text-ink">Fakturarader</h3>
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

      <button className="btn btn-primary mt-5" disabled={pending || !recipients.length}>{pending ? 'Sparar…' : 'Spara återkommande faktura'}</button>
      {!recipients.length ? <p className="mt-3 text-sm font-semibold text-rose-700">Lägg till kund innan du skapar återkommande faktura.</p> : null}
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
