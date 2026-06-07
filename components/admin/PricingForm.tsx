'use client'

import { useActionState } from 'react'
import { saveCustomerPricingAction, type ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function PricingForm({ customerId, pricing }: { customerId: string; pricing?: any }) {
  const [state, action, pending] = useActionState(saveCustomerPricingAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <div>
        <h2 className="text-xl font-black text-ink">Prisprofil</h2>
        <p className="mt-1 text-sm text-muted">Sätt kundens kommersiella villkor. Varje ändring kräver orsak och loggas.</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Startavgift" name="setup_fee" defaultValue={pricing?.setup_fee} />
        <Field label="Månadsavgift" name="monthly_fee" defaultValue={pricing?.monthly_fee} />
        <Field label="Pris per faktura" name="fee_per_invoice" defaultValue={pricing?.fee_per_invoice} />
        <Field label="Procentuell avgift per faktura" name="percentage_fee_per_invoice" defaultValue={pricing?.percentage_fee_per_invoice} />
        <Field label="Minimiavgift per månad" name="minimum_monthly_fee" defaultValue={pricing?.minimum_monthly_fee} />
        <Field label="API-avgift/mån" name="api_monthly_fee" defaultValue={pricing?.api_monthly_fee} />
        <Field label="Extra användare" name="extra_user_fee" defaultValue={pricing?.extra_user_fee} />
        <Field label="Supportavgift" name="support_fee" defaultValue={pricing?.support_fee} />
        <Field label="Moms %" name="vat_rate" defaultValue={pricing?.vat_rate ?? 25} />
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Valuta</label>
          <input name="currency" className="input" defaultValue={pricing?.currency || 'SEK'} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Faktureringsintervall</label>
          <select name="billing_interval" className="input" defaultValue={pricing?.billing_interval || 'monthly'}>
            <option value="monthly">Månadsvis</option>
            <option value="quarterly">Kvartalsvis</option>
            <option value="yearly">Årsvis</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Giltig från</label>
          <input name="valid_from" type="date" className="input" defaultValue={pricing?.valid_from || new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-ink">Orsak till ändring</label>
        <textarea name="reason" className="input min-h-24" placeholder="Exempel: Ny kund, överenskommen prisnivå efter genomgång." required />
      </div>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Sparar…' : 'Spara prisprofil'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number | string | null }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink">{label}</label>
      <input name={name} className="input" inputMode="decimal" defaultValue={defaultValue ?? ''} placeholder="0" />
    </div>
  )
}
