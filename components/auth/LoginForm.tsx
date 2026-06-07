'use client'

import { useActionState } from 'react'
import { loginAction, type AuthState } from '@/lib/actions/auth'

const initialState: AuthState = { ok: false, message: '' }

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="email">E-post</label>
        <input id="email" name="email" type="email" className="input" placeholder="namn@företag.se" required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="password">Lösenord</label>
        <input id="password" name="password" type="password" className="input" placeholder="Ditt lösenord" required />
      </div>
      {state.message ? <p className={state.ok ? 'text-sm font-semibold text-emerald-700' : 'text-sm font-semibold text-rose-700'}>{state.message}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? 'Loggar in…' : 'Logga in'}</button>
    </form>
  )
}
