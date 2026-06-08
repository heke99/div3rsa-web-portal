'use client'

import { useActionState } from 'react'
import { disablePortalAccessAction, setPortalAccessPasswordAction, type ActionState } from '@/lib/actions/applications'
import { formatDate } from '@/lib/utils/format'

const initialState: ActionState = { ok: false, message: '' }

type PortalAccessUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  must_change_password: boolean
  onboarding_status: string | null
  password_changed_at: string | null
  manual_password_set_at: string | null
  disabled_at: string | null
}

export function PortalAccessForm({ customerId, defaultEmail, defaultName, portalUsers }: { customerId: string; defaultEmail?: string | null; defaultName?: string | null; portalUsers: PortalAccessUser[] }) {
  const [state, action, pending] = useActionState(setPortalAccessPasswordAction, initialState)
  const activeUser = portalUsers.find((user) => user.status === 'active') ?? portalUsers[0]

  return (
    <section className="card p-5">
      <h2 className="text-lg font-black text-ink">Portalaccess</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Superadmin sätter lösenordet manuellt och ger det själv till kunden. Systemet skickar inget lösenordsmail.</p>

      {activeUser ? (
        <div className="mt-4 rounded-2xl border border-line bg-soft p-3 text-sm">
          <div className="font-bold text-ink">Nuvarande portaluser</div>
          <div className="mt-2 grid gap-2 text-muted">
            <div><span className="font-semibold text-ink">E-post:</span> {activeUser.email}</div>
            <div><span className="font-semibold text-ink">Roll:</span> {activeUser.role}</div>
            <div><span className="font-semibold text-ink">Status:</span> {activeUser.status}</div>
            <div><span className="font-semibold text-ink">Onboarding:</span> {activeUser.onboarding_status || '—'}</div>
            <div><span className="font-semibold text-ink">Måste byta lösenord:</span> {activeUser.must_change_password ? 'Ja' : 'Nej'}</div>
            <div><span className="font-semibold text-ink">Lösenord bytt:</span> {activeUser.password_changed_at ? formatDate(activeUser.password_changed_at) : 'Nej'}</div>
            <div><span className="font-semibold text-ink">Lösenord satt av admin:</span> {activeUser.manual_password_set_at ? formatDate(activeUser.manual_password_set_at) : '—'}</div>
          </div>
        </div>
      ) : null}

      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="customer_id" value={customerId} />
        <div>
          <label className="mb-2 block text-sm font-bold text-ink" htmlFor="portal-email">E-post</label>
          <input id="portal-email" name="email" type="email" className="input" defaultValue={activeUser?.email || defaultEmail || ''} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink" htmlFor="portal-full-name">Namn</label>
          <input id="portal-full-name" name="full_name" className="input" defaultValue={activeUser?.full_name || defaultName || ''} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink" htmlFor="portal-role">Roll</label>
          <select id="portal-role" name="role" className="input" defaultValue={activeUser?.role || 'customer_admin'}>
            <option value="customer_admin">Kundadmin</option>
            <option value="customer_user">Kundanvändare</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink" htmlFor="portal-password">Lösenord som superadmin ger till kunden</label>
          <input id="portal-password" name="password" type="password" className="input" minLength={10} autoComplete="new-password" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-ink" htmlFor="portal-confirm-password">Bekräfta lösenord</label>
          <input id="portal-confirm-password" name="confirm_password" type="password" className="input" minLength={10} autoComplete="new-password" required />
        </div>
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Sparar…' : activeUser ? 'Sätt nytt lösenord' : 'Skapa portalåtkomst'}</button>
        {state.message ? <p className={`text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
      </form>

      {activeUser?.status === 'active' ? <DisablePortalAccessForm customerId={customerId} portalUserId={activeUser.id} /> : null}
    </section>
  )
}

function DisablePortalAccessForm({ customerId, portalUserId }: { customerId: string; portalUserId: string }) {
  const [state, action, pending] = useActionState(disablePortalAccessAction, initialState)
  return (
    <form action={action} className="mt-4 border-t border-line pt-4">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="portal_user_id" value={portalUserId} />
      <button className="btn btn-secondary w-full" disabled={pending}>{pending ? 'Inaktiverar…' : 'Inaktivera portalåtkomst'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
