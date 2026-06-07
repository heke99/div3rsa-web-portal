'use client'

import { useActionState } from 'react'
import { resetPasswordAction, type AuthState } from '@/lib/actions/auth'

const initialState: AuthState = { ok: false, message: '' }

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState)
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="email">E-post</label>
        <input id="email" name="email" type="email" className="input" placeholder="namn@företag.se" required />
      </div>
      {state.message ? <p className={state.ok ? 'text-sm font-semibold text-emerald-700' : 'text-sm font-semibold text-rose-700'}>{state.message}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? 'Skickar…' : 'Skicka återställningslänk'}</button>
    </form>
  )
}
