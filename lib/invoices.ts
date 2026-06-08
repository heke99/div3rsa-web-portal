import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureEnabled, getCustomerFeatures } from '@/lib/features'

export type InvoiceLineInput = {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  sort_order?: number
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0)
  const vat = lines.reduce((sum, line) => sum + line.quantity * line.unit_price * (line.vat_rate / 100), 0)
  return { subtotal_amount: roundMoney(subtotal), vat_amount: roundMoney(vat), total_amount: roundMoney(subtotal + vat) }
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export async function getNextInvoiceNumber(paymentCustomerId: string, issueDate: string) {
  const supabase = createAdminClient()
  const year = new Date(issueDate).getFullYear()
  const prefix = `${year}-`
  const { data: current } = await supabase
    .from('invoice_number_sequences')
    .select('*')
    .eq('payment_customer_id', paymentCustomerId)
    .eq('year', year)
    .maybeSingle()

  if (current?.id) {
    const nextNumber = Number(current.next_number || 1)
    await supabase.from('invoice_number_sequences').update({ next_number: nextNumber + 1, updated_at: new Date().toISOString() }).eq('id', current.id)
    return `${current.prefix || prefix}${String(nextNumber).padStart(4, '0')}`
  }

  await supabase.from('invoice_number_sequences').insert({ payment_customer_id: paymentCustomerId, year, prefix, next_number: 2 })
  return `${prefix}0001`
}

export async function resolveAccountingSyncStatus(paymentCustomerId: string) {
  const features = await getCustomerFeatures(paymentCustomerId)
  if (!featureEnabled(features, 'accounting')) return 'not_enabled'

  const supabase = createAdminClient()
  const { data: connection } = await supabase
    .from('accounting_connections')
    .select('id,status')
    .eq('payment_customer_id', paymentCustomerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!connection) return 'not_connected'
  if (connection.status !== 'approved') return 'pending_connection_approval'
  if (!featureEnabled(features, 'bookkeeping_sync')) return 'skipped'
  return 'queued'
}

export function buildInvoiceHtml(input: {
  invoice: any
  customer: any
  recipient: any
  items: any[]
}) {
  const { invoice, customer, recipient, items } = input
  const rows = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.description)}</td>
      <td style="text-align:right">${Number(item.quantity).toLocaleString('sv-SE')}</td>
      <td style="text-align:right">${Number(item.unit_price).toLocaleString('sv-SE')} ${invoice.currency}</td>
      <td style="text-align:right">${Number(item.vat_rate).toLocaleString('sv-SE')}%</td>
      <td style="text-align:right">${Number(item.line_total).toLocaleString('sv-SE')} ${invoice.currency}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="sv">
<head><meta charset="utf-8"><title>Faktura ${escapeHtml(invoice.invoice_number || '')}</title></head>
<body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
  <div style="max-width:820px;margin:0 auto;padding:32px">
    <div style="display:flex;justify-content:space-between;gap:24px">
      <div>
        <h1 style="margin:0 0 8px;font-size:32px">Faktura</h1>
        <p style="margin:0;color:#64748b">${escapeHtml(invoice.invoice_number || 'Utkast')}</p>
      </div>
      <div style="text-align:right">
        <strong>${escapeHtml(customer.company_name || 'Div3rsa kund')}</strong><br>
        ${escapeHtml(customer.org_number || '')}<br>
        ${escapeHtml(customer.email || '')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px">
      <div>
        <h2 style="font-size:14px;text-transform:uppercase;color:#64748b">Faktureras till</h2>
        <strong>${escapeHtml(recipient.name)}</strong><br>
        ${escapeHtml(recipient.organization_number || '')}<br>
        ${escapeHtml(recipient.address_line_1 || '')}<br>
        ${escapeHtml(`${recipient.postal_code || ''} ${recipient.city || ''}`.trim())}<br>
        ${escapeHtml(recipient.email || '')}
      </div>
      <div>
        <h2 style="font-size:14px;text-transform:uppercase;color:#64748b">Detaljer</h2>
        Fakturadatum: ${escapeHtml(invoice.issue_date || '')}<br>
        Förfallodatum: ${escapeHtml(invoice.due_date || '')}<br>
        Valuta: ${escapeHtml(invoice.currency || 'SEK')}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:32px">
      <thead>
        <tr style="background:#f8fafc"><th style="text-align:left;padding:10px;border-bottom:1px solid #e2e8f0">Beskrivning</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Antal</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Pris</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Moms</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Summa</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:24px;margin-left:auto;max-width:320px">
      <div style="display:flex;justify-content:space-between"><span>Exkl. moms</span><strong>${Number(invoice.subtotal_amount).toLocaleString('sv-SE')} ${invoice.currency}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Moms</span><strong>${Number(invoice.vat_amount).toLocaleString('sv-SE')} ${invoice.currency}</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:20px;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:10px"><span>Att betala</span><strong>${Number(invoice.total_amount).toLocaleString('sv-SE')} ${invoice.currency}</strong></div>
    </div>

    <p style="margin-top:32px;color:#64748b">Betalningsinformation och villkor visas enligt bolagets inställningar. Kontakta avsändaren vid frågor.</p>
  </div>
</body>
</html>`
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
