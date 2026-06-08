'use client'

import { useActionState } from 'react'
import { addApplicationNoteAction, archiveApplicationAction, deleteApplicationAction, restoreApplicationAction, updateApplicationStatusAction, type ActionState } from '@/lib/actions/applications'
import { applicationStatuses, statusLabel } from '@/lib/data/status'

const initialState: ActionState = { ok: false, message: '' }

export function ApplicationStatusForm({ applicationId, currentStatus }: { applicationId: string; currentStatus?: string | null }) {
  const [state, action, pending] = useActionState(updateApplicationStatusAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="application_id" value={applicationId} />
      <h2 className="text-lg font-black text-ink">Status</h2>
      <p className="mt-1 text-sm text-muted">Uppdatera ansökans steg. Alla ändringar loggas.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <select name="status" defaultValue={currentStatus || 'new'} className="input">
          {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Sparar…' : 'Spara'}</button>
      </div>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function ApplicationNoteForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(addApplicationNoteAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="application_id" value={applicationId} />
      <h2 className="text-lg font-black text-ink">Intern anteckning</h2>
      <textarea name="note" className="input mt-4 min-h-28" placeholder="Skriv vad som behöver göras eller vad kunden sagt." required />
      <button className="btn btn-primary mt-3" disabled={pending}>{pending ? 'Sparar…' : 'Lägg till anteckning'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function ApplicationArchiveForm({ applicationId, archived, deleted, isSuperAdmin }: { applicationId: string; archived?: boolean; deleted?: boolean; isSuperAdmin?: boolean }) {
  const [archiveState, archiveAction, archivePending] = useActionState(archived ? restoreApplicationAction : archiveApplicationAction, initialState)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteApplicationAction, initialState)
  return (
    <section className="card p-5">
      <h2 className="text-lg font-black text-ink">Arkiv & radering</h2>
      <p className="mt-1 text-sm text-muted">Arkivering döljer ansökan från standardlistan. Permanent radering är soft-delete och kräver superadmin.</p>
      {!deleted ? (
        <form action={archiveAction} className="mt-4 space-y-2">
          <input type="hidden" name="application_id" value={applicationId} />
          <button className="btn btn-secondary w-full" disabled={archivePending}>{archivePending ? 'Sparar…' : archived ? 'Återställ från arkiv' : 'Arkivera ansökan'}</button>
          {archiveState.message ? <p className={`text-sm font-semibold ${archiveState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{archiveState.message}</p> : null}
        </form>
      ) : <p className="mt-3 text-sm font-semibold text-rose-700">Ansökan är raderad från standardvyer.</p>}

      {isSuperAdmin && !deleted ? (
        <form action={deleteAction} className="mt-5 space-y-2 border-t border-line pt-4">
          <input type="hidden" name="application_id" value={applicationId} />
          <label className="block text-sm font-bold text-ink">Raderingsorsak</label>
          <input name="delete_reason" className="input" placeholder="Ex. dubblett, felaktig ansökan" required />
          <button className="btn btn-danger w-full" disabled={deletePending}>{deletePending ? 'Raderar…' : 'Radera ansökan'}</button>
          {deleteState.message ? <p className={`text-sm font-semibold ${deleteState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{deleteState.message}</p> : null}
        </form>
      ) : null}
    </section>
  )
}
