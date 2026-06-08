'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionState } from '@/lib/actions/applications'

function str(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}
function num(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function saveInvoiceSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  const customerId = user.customer_id
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const payload = {
    payment_customer_id: customerId,
    invoice_prefix: str(formData, 'invoice_prefix') || null,
    default_payment_terms_days: Math.max(0, Math.round(num(formData.get('default_payment_terms_days'), 30))),
    default_currency: str(formData, 'default_currency') || 'SEK',
    default_vat_rate: num(formData.get('default_vat_rate'), 25),
    seller_name: str(formData, 'seller_name') || null,
    seller_org_number: str(formData, 'seller_org_number') || null,
    seller_address_line_1: str(formData, 'seller_address_line_1') || null,
    seller_address_line_2: str(formData, 'seller_address_line_2') || null,
    seller_postal_code: str(formData, 'seller_postal_code') || null,
    seller_city: str(formData, 'seller_city') || null,
    seller_country: str(formData, 'seller_country') || 'SE',
    seller_email: str(formData, 'seller_email') || null,
    bankgiro: str(formData, 'bankgiro') || null,
    plusgiro: str(formData, 'plusgiro') || null,
    iban: str(formData, 'iban') || null,
    bank_account: str(formData, 'bank_account') || null,
    invoice_footer_text: str(formData, 'invoice_footer_text') || null,
    invoice_terms_text: str(formData, 'invoice_terms_text') || null,
    logo_url: str(formData, 'logo_url') || null,
    updated_at: now,
  }

  const { error } = await supabase
    .from('invoice_settings')
    .upsert(payload, { onConflict: 'payment_customer_id' })

  if (error) return { ok: false, message: 'Kunde inte spara fakturainställningarna.' }

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'invoice_settings',
    entity_id: customerId,
    action: 'invoice_settings_saved',
    new_values: payload,
  })

  revalidatePath('/settings/company')
  revalidatePath('/settings/invoice')
  return { ok: true, message: 'Fakturainställningarna sparades.' }
}
