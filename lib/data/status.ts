export const applicationStatuses = [
  'new',
  'under_review',
  'needs_more_info',
  'qualified',
  'sent_to_partner',
  'partner_onboarding',
  'approved',
  'rejected',
  'customer_created',
] as const

export const customerStatuses = ['draft', 'awaiting_partner', 'onboarding', 'active', 'paused', 'rejected', 'cancelled'] as const

export const statusLabels: Record<string, string> = {
  new: 'Ny',
  under_review: 'Granskas',
  needs_more_info: 'Komplettering',
  qualified: 'Kvalificerad',
  sent_to_partner: 'Skickad vidare',
  partner_onboarding: 'Partner-onboarding',
  approved: 'Godkänd',
  rejected: 'Avslagen',
  customer_created: 'Kund skapad',
  draft: 'Utkast',
  awaiting_partner: 'Väntar partner',
  onboarding: 'Onboarding',
  active: 'Aktiv',
  paused: 'Pausad',
  cancelled: 'Avslutad',
}

export function statusLabel(value?: string | null) {
  if (!value) return 'Okänd'
  return statusLabels[value] ?? value
}
