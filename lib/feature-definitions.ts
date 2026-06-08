export const featureLabels: Record<string, string> = {
  invoicing: 'Fakturering',
  recurring_invoices: 'Återkommande fakturor',
  invoice_templates: 'Fakturamallar',
  invoice_pdf: 'Faktura-PDF',
  api_access: 'API & Webhooks',
  api_invoice_send: 'Skicka fakturor via API',
  api_webhooks: 'Webhooks',
  accounting: 'Accounting',
  bookkeeping_sync: 'Bokföringssynk',
  external_accounting_export: 'Extern bokföring/export',
}

export const defaultFeatureKeys = Object.keys(featureLabels)
