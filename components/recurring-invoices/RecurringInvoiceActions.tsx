'use client'

import { useActionState } from 'react'
import { createDraftFromRecurringScheduleAction, updateRecurringInvoiceStatusAction } from '@/lib/actions/recurring-invoices'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function CreateRecurringDraftForm({ scheduleId, nextRunDate }: { scheduleId: string; nextRunDate?: string | null }) {
  const [state, action, pending] = useActionState(createDraftFromRecurringScheduleAction, initialState)
  const runDate = nextRunDate || new Date().toISOString().slice(0, 10)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="schedule_id" value={scheduleId} />
      <h2 className="text-lg font-black text-ink">Skapa nästa utkast</h2>
      <p className="mt-2 text-sm text-muted">Detta skapar ett fakturautkast. Inget mail skickas automatiskt.</p>
      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-ink">Kördatum</label>
        <input name="run_date" type="date" className="input" defaultValue={runDate} />
      </div>
      <button className="btn btn-primary mt-4 w-full" disabled={pending}>{pending ? 'Skapar…' : 'Skapa fakturautkast'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function RecurringStatusForm({ scheduleId, currentStatus }: { scheduleId: string; currentStatus: string }) {
  const [state, action, pending] = useActionState(updateRecurringInvoiceStatusAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="schedule_id" value={scheduleId} />
      <h2 className="text-lg font-black text-ink">Status</h2>
      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-ink">Ändra status</label>
        <select name="status" className="input" defaultValue={currentStatus}>
          <option value="active">Aktiv</option>
          <option value="paused">Pausad</option>
          <option value="ended">Avslutad</option>
        </select>
      </div>
      <button className="btn btn-secondary mt-4 w-full" disabled={pending}>{pending ? 'Sparar…' : 'Uppdatera status'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
