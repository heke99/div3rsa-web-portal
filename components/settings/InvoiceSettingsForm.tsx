'use client'

import { useActionState } from 'react'
import { saveInvoiceSettingsAction } from '@/lib/actions/invoice-settings'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function InvoiceSettingsForm({ settings, customer }: { settings?: any; customer?: any }) {
  const [state, action, pending] = useActionState(saveInvoiceSettingsAction, initialState)
  return (
    <form action={action} className="card p-6">
      <h2 className="text-xl font-black text-ink">Fakturainställningar</h2>
      <p className="mt-1 text-sm text-muted">Dessa värden används som standard på nya fakturor och i fakturalayouten.</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Fakturaprefix" name="invoice_prefix" defaultValue={settings?.invoice_prefix} placeholder="Ex. DIV-" />
        <Field label="Betalningsvillkor, dagar" name="default_payment_terms_days" defaultValue={settings?.default_payment_terms_days ?? 30} inputMode="numeric" />
        <Field label="Standardvaluta" name="default_currency" defaultValue={settings?.default_currency || 'SEK'} />
        <Field label="Standardmoms %" name="default_vat_rate" defaultValue={settings?.default_vat_rate ?? 25} inputMode="decimal" />
        <Field label="Säljande bolag" name="seller_name" defaultValue={settings?.seller_name || customer?.company_name} />
        <Field label="Orgnummer" name="seller_org_number" defaultValue={settings?.seller_org_number || customer?.org_number} />
        <Field label="E-post" name="seller_email" defaultValue={settings?.seller_email || customer?.email} />
        <Field label="Land" name="seller_country" defaultValue={settings?.seller_country || 'SE'} />
        <Field label="Adressrad 1" name="seller_address_line_1" defaultValue={settings?.seller_address_line_1} />
        <Field label="Adressrad 2" name="seller_address_line_2" defaultValue={settings?.seller_address_line_2} />
        <Field label="Postnummer" name="seller_postal_code" defaultValue={settings?.seller_postal_code} />
        <Field label="Ort" name="seller_city" defaultValue={settings?.seller_city} />
        <Field label="Bankgiro" name="bankgiro" defaultValue={settings?.bankgiro} />
        <Field label="Plusgiro" name="plusgiro" defaultValue={settings?.plusgiro} />
        <Field label="IBAN" name="iban" defaultValue={settings?.iban} />
        <Field label="Bankkonto" name="bank_account" defaultValue={settings?.bank_account} />
        <Field label="Logo URL" name="logo_url" defaultValue={settings?.logo_url} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Area label="Villkorstext" name="invoice_terms_text" defaultValue={settings?.invoice_terms_text} />
        <Area label="Footertext" name="invoice_footer_text" defaultValue={settings?.invoice_footer_text} />
      </div>

      <button className="btn btn-primary mt-5" disabled={pending}>{pending ? 'Sparar…' : 'Spara fakturainställningar'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

function Field({ label, name, defaultValue, placeholder, inputMode }: { label: string; name: string; defaultValue?: any; placeholder?: string; inputMode?: 'numeric' | 'decimal' | 'text' }) {
  return <div><label className="mb-2 block text-sm font-bold text-ink">{label}</label><input name={name} className="input" defaultValue={defaultValue ?? ''} placeholder={placeholder} inputMode={inputMode} /></div>
}
function Area({ label, name, defaultValue }: { label: string; name: string; defaultValue?: any }) {
  return <div><label className="mb-2 block text-sm font-bold text-ink">{label}</label><textarea name={name} className="input min-h-28" defaultValue={defaultValue ?? ''} /></div>
}
