'use client'

import { useActionState } from 'react'
import {
  createAccountingExportAction,
  createFiscalYearAction,
  createInvoiceJournalAction,
  createManualJournalAction,
  initializeAccountingAction,
  postJournalEntryAction,
  saveAccountingAccountAction,
  saveAccountingSettingsAction,
} from '@/lib/actions/accounting'
import type { ActionState } from '@/lib/actions/applications'

const initial: ActionState = { ok: false, message: '' }

function StateMessage({ state }: { state: ActionState }) {
  if (!state.message) return null
  return <p className={`mt-3 text-sm font-semibold ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p>
}

export function InitializeAccountingButton() {
  const [state, action, pending] = useActionState(initializeAccountingAction, initial)
  return <form action={action}><button className="btn btn-primary" disabled={pending}>{pending ? 'Skapar grund…' : 'Skapa accounting-grund'}</button><StateMessage state={state} /></form>
}

export function AccountingSettingsForm({ settings }: { settings?: any }) {
  const [state, action, pending] = useActionState(saveAccountingSettingsAction, initial)
  return (
    <form action={action} className="card p-5">
      <h2 className="text-xl font-black text-ink">Accounting-inställningar</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label><span className="mb-2 block text-sm font-bold text-ink">Bokföringsmetod</span><select name="accounting_method" className="input" defaultValue={settings?.accounting_method || 'invoice_method'}><option value="invoice_method">Faktureringsmetoden</option><option value="cash_method">Kontantmetoden</option></select></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Låst t.o.m.</span><input className="input" name="locked_until" type="date" defaultValue={settings?.locked_until || ''} /></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Kundfordringar</span><input className="input" name="default_receivables_account" defaultValue={settings?.default_receivables_account || '1510'} /></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Bankkonto</span><input className="input" name="default_bank_account" defaultValue={settings?.default_bank_account || '1930'} /></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Försäljningskonto</span><input className="input" name="default_revenue_account" defaultValue={settings?.default_revenue_account || '3001'} /></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Utgående moms</span><input className="input" name="default_output_vat_account" defaultValue={settings?.default_output_vat_account || '2611'} /></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Fakturaserie</span><input className="input" name="journal_series_invoice" defaultValue={settings?.journal_series_invoice || 'F'} /></label>
        <label><span className="mb-2 block text-sm font-bold text-ink">Betalningsserie</span><input className="input" name="journal_series_payment" defaultValue={settings?.journal_series_payment || 'B'} /></label>
      </div>
      <label className="mt-4 block"><span className="mb-2 block text-sm font-bold text-ink">Intern notering</span><textarea className="input min-h-24" name="notes" defaultValue={settings?.notes || ''} /></label>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Sparar…' : 'Spara inställningar'}</button><StateMessage state={state} />
    </form>
  )
}

export function FiscalYearForm() {
  const [state, action, pending] = useActionState(createFiscalYearAction, initial)
  return <form action={action} className="card p-5"><h2 className="text-xl font-black text-ink">Nytt räkenskapsår</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><input className="input" name="name" placeholder="2026" /><input className="input" name="starts_on" type="date" required /><input className="input" name="ends_on" type="date" required /></div><button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skapar…' : 'Skapa'}</button><StateMessage state={state} /></form>
}

export function AccountForm() {
  const [state, action, pending] = useActionState(saveAccountingAccountAction, initial)
  return (
    <form action={action} className="card p-5">
      <h2 className="text-xl font-black text-ink">Lägg till eller uppdatera konto</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <input className="input" name="account_number" placeholder="3001" required />
        <input className="input md:col-span-2" name="account_name" placeholder="Kontonamn" required />
        <select className="input" name="account_type" defaultValue="revenue"><option value="asset">Tillgång</option><option value="equity">Eget kapital</option><option value="liability">Skuld</option><option value="revenue">Intäkt</option><option value="expense">Kostnad</option></select>
        <select className="input" name="normal_balance" defaultValue="credit"><option value="debit">Debet</option><option value="credit">Kredit</option></select>
      </div>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Sparar…' : 'Spara konto'}</button><StateMessage state={state} />
    </form>
  )
}

export function ManualJournalForm({ fiscalYears }: { fiscalYears: any[] }) {
  const [state, action, pending] = useActionState(createManualJournalAction, initial)
  return (
    <form action={action} className="card p-5">
      <h2 className="text-xl font-black text-ink">Ny manuell verifikation</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <input className="input md:col-span-2" name="description" placeholder="Beskrivning" required />
        <input className="input" name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} />
        <input className="input" name="series_code" defaultValue="A" />
      </div>
      <select className="input mt-4" name="fiscal_year_id" defaultValue=""><option value="">Välj räkenskapsår senare</option>{fiscalYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select>
      <div className="mt-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="grid gap-2 md:grid-cols-4"><input className="input" name={`line_account_${i}`} placeholder="Konto" /><input className="input" name={`line_debit_${i}`} placeholder="Debet" /><input className="input" name={`line_credit_${i}`} placeholder="Kredit" /><input className="input" name={`line_description_${i}`} placeholder="Radtext" /></div>)}</div>
      <button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skapar…' : 'Skapa utkast'}</button><StateMessage state={state} />
    </form>
  )
}

export function PostJournalButton({ entryId }: { entryId: string }) {
  const [state, action, pending] = useActionState(postJournalEntryAction, initial)
  return <form action={action}><input type="hidden" name="journal_entry_id" value={entryId} /><button className="font-bold text-emerald-700" disabled={pending}>{pending ? 'Bokför…' : 'Bokför'}</button>{state.message ? <div className="text-xs text-muted">{state.message}</div> : null}</form>
}

export function InvoiceJournalForm({ invoices, fiscalYears }: { invoices: any[]; fiscalYears: any[] }) {
  const [state, action, pending] = useActionState(createInvoiceJournalAction, initial)
  return <form action={action} className="card p-5"><h2 className="text-xl font-black text-ink">Skapa verifikationsutkast från faktura</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><select className="input" name="invoice_id" required><option value="">Välj faktura</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number || invoice.id} · {invoice.total_amount} {invoice.currency}</option>)}</select><select className="input" name="fiscal_year_id"><option value="">Räkenskapsår senare</option>{fiscalYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></div><button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skapar…' : 'Skapa utkast'}</button><StateMessage state={state} /></form>
}

export function AccountingExportForm() {
  const [state, action, pending] = useActionState(createAccountingExportAction, initial)
  return <form action={action} className="card p-5"><h2 className="text-xl font-black text-ink">Skapa export</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><select className="input" name="export_type" defaultValue="sie"><option value="sie">SIE foundation</option><option value="csv">CSV</option><option value="pdf_underlay">PDF-underlag</option></select><input className="input" name="period_start" type="date" /><input className="input" name="period_end" type="date" /></div><button className="btn btn-primary mt-4" disabled={pending}>{pending ? 'Skapar…' : 'Skapa export'}</button><StateMessage state={state} /></form>
}
