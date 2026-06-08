'use client'

import { useActionState } from 'react'
import { changeInitialPasswordAction, type AuthState } from '@/lib/actions/auth'

const initialState: AuthState = { ok: false, message: '' }

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeInitialPasswordAction, initialState)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="password">Nytt lösenord</label>
        <input id="password" name="password" type="password" className="input" placeholder="Minst 10 tecken" minLength={10} required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="confirm_password">Bekräfta nytt lösenord</label>
        <input id="confirm_password" name="confirm_password" type="password" className="input" placeholder="Skriv lösenordet igen" minLength={10} required />
      </div>
      {state.message ? <p className={state.ok ? 'text-sm font-semibold text-emerald-700' : 'text-sm font-semibold text-rose-700'}>{state.message}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? 'Sparar…' : 'Byt lösenord och fortsätt'}</button>
    </form>
  )
}
