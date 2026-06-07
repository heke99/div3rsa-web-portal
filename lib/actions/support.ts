'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireAdmin } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export type SupportState = { ok: boolean; message: string }

export async function createSupportTicketAction(_prev: SupportState, formData: FormData): Promise<SupportState> {
  const user = await requireUser()
  if (!user.customer_id) return { ok: false, message: 'Kundkoppling saknas.' }
  const subject = String(formData.get('subject') || '').trim()
  const message = String(formData.get('message') || '').trim()
  if (subject.length < 3 || message.length < 5) return { ok: false, message: 'Skriv ämne och meddelande.' }

  const supabase = createAdminClient()
  const { data: ticket, error } = await supabase.from('support_tickets').insert({ customer_id: user.customer_id, created_by: user.id, subject, status: 'open' }).select('id').single()
  if (error || !ticket) return { ok: false, message: 'Kunde inte skapa ärende.' }
  await supabase.from('support_ticket_messages').insert({ ticket_id: ticket.id, sender_user_id: user.id, sender_role: user.role, message })
  await supabase.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.role, entity_type: 'support_ticket', entity_id: ticket.id, action: 'support_ticket_created', new_values: { subject } })
  revalidatePath('/support')
  return { ok: true, message: 'Ärendet är skapat.' }
}

export async function replySupportTicketAction(_prev: SupportState, formData: FormData): Promise<SupportState> {
  const user = await requireAdmin()
  const ticketId = String(formData.get('ticket_id') || '')
  const message = String(formData.get('message') || '').trim()
  const status = String(formData.get('status') || 'open')
  if (!ticketId || message.length < 2) return { ok: false, message: 'Skriv ett svar.' }
  const supabase = createAdminClient()
  await supabase.from('support_ticket_messages').insert({ ticket_id: ticketId, sender_user_id: user.id, sender_role: user.role, message })
  await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId)
  await supabase.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.role, entity_type: 'support_ticket', entity_id: ticketId, action: 'support_reply_sent', new_values: { status } })
  revalidatePath('/admin/support')
  return { ok: true, message: 'Svar sparat.' }
}
