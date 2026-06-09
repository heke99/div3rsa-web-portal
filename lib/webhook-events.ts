export const webhookEvents = [
  'invoice.created',
  'invoice.sent',
  'invoice.failed',
  'invoice.paid',
  'invoice.overdue',
  'invoice.cancelled',
  'invoice.credited',
  'email.sent',
  'email.failed',
  'accounting.sync.queued',
  'accounting.sync.succeeded',
  'accounting.sync.failed',
] as const

export type WebhookEventType = typeof webhookEvents[number]
