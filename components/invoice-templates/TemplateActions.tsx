'use client'

import { useActionState } from 'react'
import { createInvoiceDraftFromTemplateAction, deleteInvoiceTemplateAction } from '@/lib/actions/invoice-templates'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function CreateInvoiceFromTemplateForm({ templateId, recipients }: { templateId: string; recipients: any[] }) {
  const [state, action, pending] = useActionState(createInvoiceDraftFromTemplateAction, initialState)
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="template_id" value={templateId} />
      <h2 className="text-lg font-black text-ink">Skapa faktura från mall</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Kund</label>
          <select name="invoice_customer_id" className="input" required>
            <option value="">Välj kund</option>
            {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
          </select>
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
      <button className="btn btn-primary mt-4 w-full" disabled={pending || !recipients.length}>{pending ? 'Skapar…' : 'Skapa fakturautkast'}</button>
      {!recipients.length ? <p className="mt-3 text-sm font-semibold text-rose-700">Lägg till kund innan du skapar faktura från mall.</p> : null}
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function DeleteInvoiceTemplateForm({ templateId }: { templateId: string }) {
  const [state, action, pending] = useActionState(deleteInvoiceTemplateAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="template_id" value={templateId} />
      <h2 className="text-lg font-black text-ink">Ta bort mall</h2>
      <p className="mt-2 text-sm text-muted">Detta tar bara bort mallen. Redan skapade fakturor påverkas inte.</p>
      <button className="btn btn-secondary mt-4 w-full" disabled={pending}>{pending ? 'Tar bort…' : 'Ta bort fakturamall'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
