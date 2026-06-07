'use client'

import { useActionState } from 'react'
import { sendPortalInviteAction, type ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function InviteForm({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(sendPortalInviteAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <h2 className="text-lg font-black text-ink">Portalaccess</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Skicka en aktiveringslänk till kundens e-post. Länken gäller i 48 timmar.</p>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skickar…' : 'Skicka portalinbjudan'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
