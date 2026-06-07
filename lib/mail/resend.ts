import 'server-only'
import { Resend } from 'resend'

export function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export function mailFrom() {
  return process.env.MAIL_FROM || 'info@div3rsa.com'
}
