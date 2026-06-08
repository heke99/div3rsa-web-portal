'use client'

import { useActionState } from 'react'
import { apiScopes } from '@/lib/api/scopes'
import { createApiKeyAction, revokeApiKeyAction, type ApiKeyActionState } from '@/lib/actions/api-keys'
import type { ActionState } from '@/lib/actions/applications'

const createInitialState: ApiKeyActionState = { ok: false, message: '' }
const actionInitialState: ActionState = { ok: false, message: '' }

const scopeLabels: Record<string, string> = {
  'customers:read': 'Läsa kunder',
  'customers:write': 'Skapa kunder',
  'invoices:read': 'Läsa fakturor',
  'invoices:write': 'Skapa fakturor',
  'invoices:send': 'Skicka fakturor',
  'invoices:mark_paid': 'Markera betald',
  'recurring:read': 'Läsa återkommande',
  'recurring:write': 'Skapa återkommande',
  'accounting:read': 'Läsa accounting-status',
  'webhooks:write': 'Hantera webhooks',
}

export function ApiKeyManager({ apiKeys, logs }: { apiKeys: any[]; logs: any[] }) {
  const [createState, createAction, createPending] = useActionState(createApiKeyAction, createInitialState)
  return (
    <div className="space-y-5">
      <form action={createAction} className="card p-5">
        <h2 className="text-xl font-black text-ink">Skapa API-nyckel</h2>
        <p className="mt-1 text-sm text-muted">Nyckeln visas bara en gång. Spara den säkert direkt.</p>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold text-ink">Namn</label>
          <input name="name" className="input" placeholder="Ex. Integration, Fortnox, egen app" required />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {apiScopes.map((scope) => <label key={scope} className="flex items-center gap-2 rounded-xl border border-line bg-soft px-3 py-2 text-sm font-semibold text-ink"><input type="checkbox" name={`scope_${scope}`} defaultChecked={scope.startsWith('customers:') || scope.startsWith('invoices:')} /> {scopeLabels[scope]}</label>)}
        </div>
        <button className="btn btn-primary mt-4" disabled={createPending}>{createPending ? 'Skapar…' : 'Skapa nyckel'}</button>
        {createState.message ? <p className={`mt-3 text-sm font-semibold ${createState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{createState.message}</p> : null}
        {createState.plainKey ? <pre className="mt-3 overflow-auto rounded-2xl border border-line bg-slate-950 p-4 text-sm font-bold text-white">{createState.plainKey}</pre> : null}
      </form>

      <section className="card table-wrap">
        <table>
          <thead><tr><th>Namn</th><th>Prefix</th><th>Scopes</th><th>Status</th><th>Senast använd</th><th></th></tr></thead>
          <tbody>{apiKeys.map((key) => <ApiKeyRow key={key.id} apiKey={key} />)}</tbody>
        </table>
        {apiKeys.length === 0 ? <div className="p-6 text-center text-muted">Inga API-nycklar ännu.</div> : null}
      </section>

      <section className="card table-wrap">
        <table>
          <thead><tr><th>Metod</th><th>Path</th><th>Status</th><th>Fel</th><th>Datum</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id}><td>{log.method}</td><td>{log.path}</td><td>{log.status_code || '—'}</td><td>{log.error_message || '—'}</td><td>{log.created_at ? new Date(log.created_at).toLocaleString('sv-SE') : '—'}</td></tr>)}</tbody>
        </table>
        {logs.length === 0 ? <div className="p-6 text-center text-muted">Inga API-anrop loggade ännu.</div> : null}
      </section>
    </div>
  )
}

function ApiKeyRow({ apiKey }: { apiKey: any }) {
  const [state, action, pending] = useActionState(revokeApiKeyAction, actionInitialState)
  return (
    <tr>
      <td><div className="font-bold">{apiKey.name}</div><div className="text-sm text-muted">…{apiKey.key_tail || ''}</div></td>
      <td>{apiKey.key_prefix}</td>
      <td><span className="text-sm text-muted">{Array.isArray(apiKey.scopes) ? apiKey.scopes.join(', ') : '—'}</span></td>
      <td>{apiKey.status}</td>
      <td>{apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleString('sv-SE') : 'Aldrig'}</td>
      <td>
        {apiKey.status === 'active' ? <form action={action}><input type="hidden" name="api_key_id" value={apiKey.id} /><button className="font-bold text-rose-700" disabled={pending}>{pending ? 'Återkallar…' : 'Återkalla'}</button>{state.message ? <div className="mt-1 text-xs text-muted">{state.message}</div> : null}</form> : null}
      </td>
    </tr>
  )
}
