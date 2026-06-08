'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/session'
import type { ActionState } from '@/lib/actions/applications'

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim() || null
}

async function requireCustomerId() {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  return { user, customerId: user.customer_id }
}

export async function saveInvoiceCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerId()
  const id = value(formData, 'id')
  const name = value(formData, 'name')
  const email = value(formData, 'email')

  if (!name || !email) return { ok: false, message: 'Namn och e-post krävs.' }

  const payload = {
    payment_customer_id: customerId,
    customer_type: value(formData, 'customer_type') || 'company',
    name,
    organization_number: value(formData, 'organization_number'),
    contact_person: value(formData, 'contact_person'),
    email,
    phone: value(formData, 'phone'),
    address_line_1: value(formData, 'address_line_1'),
    address_line_2: value(formData, 'address_line_2'),
    postal_code: value(formData, 'postal_code'),
    city: value(formData, 'city'),
    country: value(formData, 'country') || 'SE',
    invoice_reference: value(formData, 'invoice_reference'),
    default_payment_terms_days: Number(formData.get('default_payment_terms_days') || 30),
    default_vat_rate: Number(formData.get('default_vat_rate') || 25),
    currency: value(formData, 'currency') || 'SEK',
    notes: value(formData, 'notes'),
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const supabase = createAdminClient()
  const query = id
    ? supabase.from('invoice_customers').update(payload).eq('id', id).eq('payment_customer_id', customerId).select('id').single()
    : supabase.from('invoice_customers').insert(payload).select('id').single()

  const { data, error } = await query
  if (error || !data) return { ok: false, message: 'Kunde inte spara kunden.' }

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'invoice_customer',
    entity_id: data.id,
    action: id ? 'invoice_customer_updated' : 'invoice_customer_created',
    new_values: payload,
  })

  revalidatePath('/invoice-customers')
  revalidatePath(`/invoice-customers/${data.id}`)
  return { ok: true, message: id ? 'Kunden uppdaterades.' : 'Kunden skapades.' }
}
