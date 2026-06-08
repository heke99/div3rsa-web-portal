'use client'

import { useActionState } from 'react'
import { adminResendInvoiceAction, markInvoicePaidAction, sendInvoiceAction } from '@/lib/actions/invoices'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function SendInvoiceButton({ invoiceId, disabled, resent }: { invoiceId: string; disabled?: boolean; resent?: boolean }) {
  const [state, action, pending] = useActionState(sendInvoiceAction, initialState)
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <button className="btn btn-primary w-full" disabled={pending || disabled}>{pending ? 'Skickar…' : resent ? 'Skicka om faktura' : 'Skicka faktura'}</button>
      {state.message ? <p className={`text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function AdminResendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(adminResendInvoiceAction, initialState)
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Skickar…' : 'Skicka om faktura'}</button>
      {state.message ? <p className={`text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function MarkInvoicePaidForm({ invoiceId, totalAmount }: { invoiceId: string; totalAmount: number }) {
  const [state, action, pending] = useActionState(markInvoicePaidAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <h2 className="text-lg font-black text-ink">Markera betald</h2>
      <div className="mt-3 grid gap-3">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Belopp</label>
          <input name="amount" className="input" inputMode="decimal" defaultValue={totalAmount} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Betaldatum</label>
          <input name="paid_at" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Referens</label>
          <input name="reference" className="input" placeholder="Bankgiro/OCR/referens" />
        </div>
      </div>
      <button className="btn btn-secondary mt-4 w-full" disabled={pending}>{pending ? 'Sparar…' : 'Markera som betald'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
