import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest, logApiRequest } from '@/lib/api/auth'
import { sendSmtpMail } from '@/lib/mail/smtp'
import { buildInvoiceHtml, getInvoiceSettings, getNextInvoiceNumber, resolveAccountingSyncStatus } from '@/lib/invoices'
import { enqueueWebhookEvent } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request, ['invoices:send'])
  if (!auth.ok) { await logApiRequest({ auth, request, statusCode: auth.status, errorMessage: auth.error }); return apiError(auth.error, auth.status) }
  const { id } = await context.params
  const [{ data: invoice }, { data: customer }] = await Promise.all([
    auth.supabase.from('invoices').select('*').eq('id', id).eq('payment_customer_id', auth.customerId).maybeSingle(),
    auth.supabase.from('payment_customers').select('*').eq('id', auth.customerId).maybeSingle(),
  ])
  if (!invoice || !customer) { await logApiRequest({ auth, request, statusCode: 404, errorMessage: 'Invoice not found.' }); return apiError('Invoice not found.', 404) }
  const [{ data: recipient }, { data: items }, settings] = await Promise.all([
    auth.supabase.from('invoice_customers').select('*').eq('id', invoice.invoice_customer_id).eq('payment_customer_id', auth.customerId).maybeSingle(),
    auth.supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    getInvoiceSettings(auth.customerId),
  ])
  if (!recipient?.email) { await logApiRequest({ auth, request, statusCode: 400, errorMessage: 'Recipient email missing.' }); return apiError('Recipient email missing.', 400) }

  const alreadySent = Boolean(invoice.sent_at || invoice.invoice_number)
  const invoiceNumber = invoice.invoice_number || await getNextInvoiceNumber(auth.customerId, invoice.issue_date)
  const html = buildInvoiceHtml({ invoice: { ...invoice, invoice_number: invoiceNumber }, customer, recipient, items: items ?? [], settings })
  const subject = `Faktura ${invoiceNumber} från ${settings?.seller_name || customer.company_name}`
  let status = 'sent'
  let errorMessage: string | null = null
  let providerMessageId: string | null = null
  try {
    const result = await sendSmtpMail({ to: recipient.email, subject, html, text: `Faktura ${invoiceNumber}`, replyTo: settings?.seller_email || customer.email })
    providerMessageId = typeof result.messageId === 'string' ? result.messageId : null
  } catch (error) {
    status = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error.'
  }
  const { data: emailLog } = await auth.supabase.from('invoice_email_logs').insert({ invoice_id: id, payment_customer_id: auth.customerId, recipient: recipient.email, subject, status, provider_message_id: providerMessageId, error_message: errorMessage, sent_at: status === 'sent' ? new Date().toISOString() : null }).select('id').single()
  if (status === 'sent') {
    const accountingSyncStatus = await resolveAccountingSyncStatus(auth.customerId)
    await auth.supabase.from('invoices').update({ invoice_number: invoiceNumber, status: ['paid','overdue','cancelled','credited'].includes(invoice.status) ? invoice.status : 'sent', sent_at: invoice.sent_at || new Date().toISOString(), accounting_sync_status: accountingSyncStatus, updated_at: new Date().toISOString() }).eq('id', id).eq('payment_customer_id', auth.customerId)
    await auth.supabase.from('invoice_events').insert({ invoice_id: id, payment_customer_id: auth.customerId, actor_role: 'api', event_type: alreadySent ? 'invoice_resent' : 'invoice_sent', description: alreadySent ? 'Faktura skickades om via API.' : 'Faktura skickades via API.', metadata: { email_log_id: emailLog?.id || null } })
    await enqueueWebhookEvent({ paymentCustomerId: auth.customerId, eventType: alreadySent ? 'email.sent' : 'invoice.sent', source: 'api', entityType: 'invoice', entityId: id, payload: { invoice_id: id, invoice_number: invoiceNumber, status: 'sent' } })
    await logApiRequest({ auth, request, statusCode: 200 })
    return NextResponse.json({ data: { id, status: 'sent', invoice_number: invoiceNumber } })
  }
  await auth.supabase.from('invoice_events').insert({ invoice_id: id, payment_customer_id: auth.customerId, actor_role: 'api', event_type: 'invoice_email_failed', description: `API SMTP-fel: ${errorMessage}`, metadata: { email_log_id: emailLog?.id || null } })
  await enqueueWebhookEvent({ paymentCustomerId: auth.customerId, eventType: 'email.failed', source: 'api', entityType: 'invoice', entityId: id, payload: { invoice_id: id, error: errorMessage } })
  await logApiRequest({ auth, request, statusCode: 502, errorMessage })
  return apiError('Invoice email failed.', 502)
}
