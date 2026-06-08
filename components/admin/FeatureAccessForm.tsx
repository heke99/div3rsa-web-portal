'use client'

import { useActionState } from 'react'
import { saveCustomerFeaturesAction } from '@/lib/actions/features'
import { featureLabels } from '@/lib/feature-definitions'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function FeatureAccessForm({ customerId, features }: { customerId: string; features: Record<string, boolean> }) {
  const [state, action, pending] = useActionState(saveCustomerFeaturesAction, initialState)
  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <div>
        <h2 className="text-xl font-black text-ink">Moduler och access</h2>
        <p className="mt-1 text-sm text-muted">Aktivera de funktioner kunden ska ha tillgång till.</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Object.entries(featureLabels).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded-2xl border border-line bg-soft p-4 text-sm font-bold text-ink">
            <input type="checkbox" name="features" value={key} defaultChecked={features[key]} className="h-4 w-4" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <button className="btn btn-primary mt-5" disabled={pending}>{pending ? 'Sparar…' : 'Spara moduler'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}
