import 'server-only'
import nodemailer from 'nodemailer'

export type SmtpMailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string | null
}

function boolFromEnv(value?: string | null) {
  return value === 'true' || value === '1' || value === 'yes'
}

export function smtpFrom() {
  const from = process.env.SMTP_FROM
  if (!from) throw new Error('Saknar SMTP_FROM i miljövariablerna.')
  return from
}

export async function sendSmtpMail(input: SmtpMailInput) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '465')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  if (!host || !port || !user || !pass) {
    throw new Error('Saknar SMTP-konfiguration. Kontrollera SMTP_HOST, SMTP_PORT, SMTP_USER och SMTP_PASSWORD.')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: boolFromEnv(process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')),
    auth: { user, pass },
  })

  return transporter.sendMail({
    from: smtpFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || undefined,
  })
}
