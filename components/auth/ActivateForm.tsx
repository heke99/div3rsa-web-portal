'use client'

import { useActionState } from 'react'
import { activateAccountAction, type ActivateState } from '@/lib/actions/activate'

const initialState: ActivateState = { ok: false, message: '' }

export function ActivateForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(activateAccountAction, initialState)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="password">Skapa lösenord</label>
        <input id="password" name="password" type="password" className="input" placeholder="Minst 8 tecken" required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="confirm_password">Bekräfta lösenord</label>
        <input id="confirm_password" name="confirm_password" type="password" className="input" placeholder="Skriv samma lösenord igen" required />
      </div>
      {state.message ? <p className="text-sm font-semibold text-rose-700">{state.message}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? 'Aktiverar…' : 'Aktivera konto'}</button>
    </form>
  )
}
