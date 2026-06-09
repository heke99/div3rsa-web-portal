'use client'

import { useActionState } from 'react'
import { createWebhookEndpointAction, disableWebhookEndpointAction, testWebhookEndpointAction, updateWebhookEndpointAction, type WebhookActionState } from '@/lib/actions/webhooks'
import { webhookEvents } from '@/lib/webhook-events'
import type { ActionState } from '@/lib/actions/applications'

const createInitial: WebhookActionState = { ok: false, message: '' }
const actionInitial: ActionState = { ok: false, message: '' }

const labels: Record<string, string> = {
  'invoice.created': 'Faktura skapad',
  'invoice.sent': 'Faktura skickad',
  'invoice.failed': 'Faktura misslyckades',
  'invoice.paid': 'Faktura betald',
  'invoice.overdue': 'Faktura förfallen',
  'invoice.cancelled': 'Faktura avbruten',
  'invoice.credited': 'Faktura krediterad',
  'email.sent': 'Mail skickat',
  'email.failed': 'Mail misslyckades',
  'accounting.sync.queued': 'Bokföringssynk köad',
  'accounting.sync.succeeded': 'Bokföringssynk klar',
  'accounting.sync.failed': 'Bokföringssynk misslyckades',
}

export function WebhookManager({ endpoints, deliveries }: { endpoints: any[]; deliveries: any[] }) {
  const [state, action, pending] = useActionState(createWebhookEndpointAction, createInitial)
  return (
    <div className="space-y-5">
      <form action={action} className="card p-5">
        <h2 className="text-xl font-black text-ink">Skapa webhook endpoint</h2>
        <p className="mt-1 text-sm text-muted">URL måste vara HTTPS. Signing secret visas bara en gång.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-bold text-ink">Namn</span><input className="input" name="name" placeholder="Ex. CRM, ekonomisystem" required /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold text-ink">URL</span><input className="input" name="url" placeholder="https://example.com/webhooks/div3rsa" required /></label>
        </div>
        <label className="mt-4 block"><span className="mb-2 block text-sm font-bold text-ink">Beskrivning</span><input className="input" name="description" placeholder="Intern notering" /></label>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {webhookEvents.map((event) => <label key={event} className="flex items-center gap-2 rounded-xl border border-line bg-soft px-3 py-2 text-sm font-semibold text-ink"><input type="checkbox" name={`event_${event}`} defaultChecked={event.startsWith('invoice.')} /> {labels[event] || event}</label>)}
        </div>
        <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skapar…' : 'Skapa webhook'}</button>
        {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
        {state.signingSecret ? <pre className="mt-3 overflow-auto rounded-2xl border border-line bg-slate-950 p-4 text-sm font-bold text-white">{state.signingSecret}</pre> : null}
      </form>

      <section className="card table-wrap">
        <table><thead><tr><th>Namn</th><th>URL</th><th>Events</th><th>Status</th><th>Senast testad</th><th>Actions</th></tr></thead><tbody>{endpoints.map((endpoint) => <WebhookRow key={endpoint.id} endpoint={endpoint} />)}</tbody></table>
        {!endpoints.length ? <div className="p-6 text-center text-muted">Inga webhooks ännu.</div> : null}
      </section>

      <section className="card table-wrap">
        <div className="p-5"><h2 className="text-xl font-black text-ink">Senaste deliveries</h2></div>
        <table><thead><tr><th>Event</th><th>Status</th><th>HTTP</th><th>Fel</th><th>Datum</th></tr></thead><tbody>{deliveries.map((delivery) => <tr key={delivery.id}><td>{delivery.event_type}</td><td>{delivery.status}</td><td>{delivery.response_status || '—'}</td><td>{delivery.last_error || '—'}</td><td>{delivery.created_at ? new Date(delivery.created_at).toLocaleString('sv-SE') : '—'}</td></tr>)}</tbody></table>
      </section>
    </div>
  )
}

function WebhookRow({ endpoint }: { endpoint: any }) {
  const [updateState, updateAction, updatePending] = useActionState(updateWebhookEndpointAction, actionInitial)
  const [testState, testAction, testPending] = useActionState(testWebhookEndpointAction, actionInitial)
  const [disableState, disableAction, disablePending] = useActionState(disableWebhookEndpointAction, actionInitial)
  const activeEvents = Array.isArray(endpoint.events) ? endpoint.events : []
  return (
    <tr>
      <td><div className="font-bold">{endpoint.name || 'Webhook'}</div><div className="text-xs text-muted">secret …{endpoint.secret_tail || '—'}</div></td>
      <td className="max-w-xs truncate">{endpoint.url}</td>
      <td><span className="text-sm text-muted">{activeEvents.join(', ') || '—'}</span></td>
      <td>{endpoint.status}</td>
      <td>{endpoint.last_tested_at ? new Date(endpoint.last_tested_at).toLocaleString('sv-SE') : 'Aldrig'}</td>
      <td>
        <details className="space-y-3">
          <summary className="cursor-pointer font-bold text-ink">Hantera</summary>
          <form action={updateAction} className="mt-3 space-y-2 rounded-xl border border-line bg-soft p-3">
            <input type="hidden" name="webhook_id" value={endpoint.id} />
            <input className="input" name="name" defaultValue={endpoint.name || ''} />
            <input className="input" name="url" defaultValue={endpoint.url || ''} />
            <input className="input" name="description" defaultValue={endpoint.description || ''} />
            <div className="grid gap-1 md:grid-cols-2">{webhookEvents.map((event) => <label key={event} className="text-xs font-semibold"><input type="checkbox" name={`event_${event}`} defaultChecked={activeEvents.includes(event)} /> {event}</label>)}</div>
            <button className="btn btn-secondary" disabled={updatePending}>{updatePending ? 'Sparar…' : 'Spara'}</button>
            {updateState.message ? <p className="text-xs text-muted">{updateState.message}</p> : null}
          </form>
          <form action={testAction} className="inline-block"><input type="hidden" name="webhook_id" value={endpoint.id} /><button className="btn btn-secondary" disabled={testPending}>{testPending ? 'Testar…' : 'Testa'}</button>{testState.message ? <p className="text-xs text-muted">{testState.message}</p> : null}</form>
          {endpoint.status === 'active' ? <form action={disableAction} className="inline-block ml-2"><input type="hidden" name="webhook_id" value={endpoint.id} /><button className="font-bold text-rose-700" disabled={disablePending}>Inaktivera</button>{disableState.message ? <p className="text-xs text-muted">{disableState.message}</p> : null}</form> : null}
        </details>
      </td>
    </tr>
  )
}
