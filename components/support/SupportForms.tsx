'use client'

import { useActionState } from 'react'
import { createSupportTicketAction, replySupportTicketAction, type SupportState } from '@/lib/actions/support'

const initialState: SupportState = { ok: false, message: '' }

export function CustomerSupportForm() {
  const [state, action, pending] = useActionState(createSupportTicketAction, initialState)
  return (
    <form action={action} className="card p-5">
      <h2 className="text-xl font-black text-ink">Nytt supportärende</h2>
      <div className="mt-4 space-y-3">
        <input name="subject" className="input" placeholder="Ämne" required />
        <textarea name="message" className="input min-h-32" placeholder="Beskriv vad du behöver hjälp med." required />
      </div>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skickar…' : 'Skicka ärende'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

export function AdminReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(replySupportTicketAction, initialState)
  return (
    <form action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <textarea name="message" className="input min-h-24" placeholder="Skriv svar/internt nästa steg" required />
      <select name="status" className="input" defaultValue="waiting_customer">
        <option value="open">Öppen</option>
        <option value="waiting_customer">Väntar kund</option>
        <option value="resolved">Löst</option>
      </select>
      <button className="btn btn-primary" disabled={pending}>{pending ? 'Sparar…' : 'Spara svar'}</button>
      {state.message ? <p className={`text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
