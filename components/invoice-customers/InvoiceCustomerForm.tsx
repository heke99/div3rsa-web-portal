'use client'

import { useActionState } from 'react'
import { saveInvoiceCustomerAction } from '@/lib/actions/invoice-customers'
import type { ActionState } from '@/lib/actions/applications'

const initialState: ActionState = { ok: false, message: '' }

export function InvoiceCustomerForm({ customer }: { customer?: any }) {
  const [state, action, pending] = useActionState(saveInvoiceCustomerAction, initialState)
  return (
    <form action={action} className="card p-5">
      {customer?.id ? <input type="hidden" name="id" value={customer.id} /> : null}
      <div>
        <h2 className="text-xl font-black text-ink">Fakturamottagare</h2>
        <p className="mt-1 text-sm text-muted">Spara mottagare som kan väljas när ni skapar fakturor.</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Kundtyp</label>
          <select name="customer_type" className="input" defaultValue={customer?.customer_type || 'company'}>
            <option value="company">Företag</option>
            <option value="person">Privatperson</option>
            <option value="eu_company">EU-företag</option>
            <option value="outside_eu">Utanför EU</option>
          </select>
        </div>
        <Field label="Namn/företag" name="name" defaultValue={customer?.name} required />
        <Field label="Org-/personnummer" name="organization_number" defaultValue={customer?.organization_number} />
        <Field label="Kontaktperson" name="contact_person" defaultValue={customer?.contact_person} />
        <Field label="E-post" name="email" type="email" defaultValue={customer?.email} required />
        <Field label="Telefon" name="phone" defaultValue={customer?.phone} />
        <Field label="Adress" name="address_line_1" defaultValue={customer?.address_line_1} />
        <Field label="Adressrad 2" name="address_line_2" defaultValue={customer?.address_line_2} />
        <Field label="Postnummer" name="postal_code" defaultValue={customer?.postal_code} />
        <Field label="Ort" name="city" defaultValue={customer?.city} />
        <Field label="Land" name="country" defaultValue={customer?.country || 'SE'} />
        <Field label="Fakturareferens" name="invoice_reference" defaultValue={customer?.invoice_reference} />
        <Field label="Betalningsvillkor dagar" name="default_payment_terms_days" type="number" defaultValue={customer?.default_payment_terms_days ?? 30} />
        <Field label="Standardmoms %" name="default_vat_rate" type="number" defaultValue={customer?.default_vat_rate ?? 25} />
        <Field label="Valuta" name="currency" defaultValue={customer?.currency || 'SEK'} />
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-ink">Anteckningar</label>
        <textarea name="notes" className="input min-h-24" defaultValue={customer?.notes || ''} />
      </div>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Sparar…' : 'Spara kund'}</button>
      {state.message ? <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p> : null}
    </form>
  )
}

function Field({ label, name, defaultValue, type = 'text', required }: { label: string; name: string; defaultValue?: any; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink">{label}</label>
      <input name={name} type={type} className="input" defaultValue={defaultValue ?? ''} required={required} />
    </div>
  )
}
