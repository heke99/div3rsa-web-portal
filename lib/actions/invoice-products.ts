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

async function requireCustomerContext() {
  const user = await requireUser()
  if (!user.customer_id) redirect('/dashboard')
  return { user, customerId: user.customer_id }
}

export async function saveInvoiceProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const id = str(formData, 'id') || null
  const name = str(formData, 'name')
  const description = str(formData, 'description') || null
  const sku = str(formData, 'sku') || null
  const unit = str(formData, 'unit') || 'st'
  const unitPrice = num(formData.get('unit_price'), 0)
  const vatRate = num(formData.get('vat_rate'), 25)
  const currency = str(formData, 'currency') || 'SEK'
  const isActive = formData.get('is_active') !== 'off'

  if (!name) return { ok: false, message: 'Ange artikelnamn.' }
  if (unitPrice < 0) return { ok: false, message: 'Pris kan inte vara negativt.' }

  const supabase = createAdminClient()
  const payload = {
    payment_customer_id: customerId,
    name,
    description,
    sku,
    unit,
    unit_price: unitPrice,
    vat_rate: vatRate,
    currency,
    is_active: isActive,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const query = id
    ? supabase.from('invoice_products').update(payload).eq('id', id).eq('payment_customer_id', customerId).select('id').single()
    : supabase.from('invoice_products').insert(payload).select('id').single()

  const { data, error } = await query
  if (error || !data) return { ok: false, message: 'Kunde inte spara artikeln.' }

  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'invoice_product',
    entity_id: data.id,
    action: id ? 'invoice_product_updated' : 'invoice_product_created',
    new_values: { name, sku, unit, unit_price: unitPrice, vat_rate: vatRate, currency, is_active: isActive },
  })

  revalidatePath('/invoice-products')
  revalidatePath(`/invoice-products/${data.id}`)
  return { ok: true, message: id ? 'Artikeln uppdaterades.' : 'Artikeln skapades.' }
}

export async function toggleInvoiceProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, customerId } = await requireCustomerContext()
  const id = str(formData, 'product_id')
  const isActive = str(formData, 'is_active') === 'true'
  if (!id) return { ok: false, message: 'Artikel saknas.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('invoice_products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('payment_customer_id', customerId)

  if (error) return { ok: false, message: 'Kunde inte uppdatera artikeln.' }
  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    entity_type: 'invoice_product',
    entity_id: id,
    action: isActive ? 'invoice_product_activated' : 'invoice_product_deactivated',
    new_values: { is_active: isActive },
  })
  revalidatePath('/invoice-products')
  revalidatePath(`/invoice-products/${id}`)
  return { ok: true, message: isActive ? 'Artikeln aktiverades.' : 'Artikeln inaktiverades.' }
}
