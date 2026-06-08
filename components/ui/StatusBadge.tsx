import { statusLabel } from '@/lib/data/status'

const colors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  needs_more_info: 'bg-orange-50 text-orange-700 border-orange-200',
  qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  sent_to_partner: 'bg-purple-50 text-purple-700 border-purple-200',
  partner_onboarding: 'bg-purple-50 text-purple-700 border-purple-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  paused: 'bg-slate-50 text-slate-700 border-slate-200',
  ended: 'bg-slate-50 text-slate-700 border-slate-200',
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  customer_created: 'bg-emerald-50 text-emerald-700 border-emerald-200',

  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-blue-50 text-blue-700 border-blue-200',
  viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-amber-50 text-amber-700 border-amber-200',
  credited: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  not_enabled: 'bg-slate-50 text-slate-700 border-slate-200',
  not_connected: 'bg-slate-50 text-slate-700 border-slate-200',
  pending_connection_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  queued: 'bg-blue-50 text-blue-700 border-blue-200',
  syncing: 'bg-purple-50 text-purple-700 border-purple-200',
  synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  skipped: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function StatusBadge({ value }: { value?: string | null }) {
  const color = value ? colors[value] : undefined
  return <span className={`badge border ${color ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>{statusLabel(value)}</span>
}
