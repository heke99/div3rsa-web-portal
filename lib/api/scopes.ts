export const apiScopes = [
  'customers:read',
  'customers:write',
  'invoices:read',
  'invoices:write',
  'invoices:send',
  'invoices:mark_paid',
  'recurring:read',
  'recurring:write',
  'accounting:read',
  'webhooks:write',
] as const

export type ApiScope = typeof apiScopes[number]
