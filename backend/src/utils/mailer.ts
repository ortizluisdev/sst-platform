import { resolve4 } from 'node:dns/promises'
import nodemailer, { type Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'
import { env, isZohoConfigured } from '../config/env.js'

const TIMEOUT_MS = 10_000

let transporter: Transporter | null = null

if (isZohoConfigured) {
  // dns.setDefaultResultOrder('ipv4first') (server.ts) no basta: Nodemailer
  // resuelve tanto A como AAAA en lib/shared/index.js y elige una dirección AL
  // AZAR entre ambas para conectar (no respeta el orden). En Render, sin salida
  // IPv6, eso hace que ~50% de los intentos fallen con ENETUNREACH. Resolvemos
  // nosotros la IPv4 y se la pasamos como host literal — `resolveHostname` la
  // deja pasar tal cual cuando ya es una IP, sin tocar IPv6 en absoluto.
  // `servername` va aparte para que la verificación TLS siga validando contra
  // el hostname real, no contra la IP.
  let smtpHost: string = env.ZOHO_SMTP_HOST!
  try {
    const addresses = await resolve4(env.ZOHO_SMTP_HOST!)
    if (addresses[0]) smtpHost = addresses[0]
  } catch (err) {
    console.warn(`[mailer] No se pudo resolver IPv4 de ${env.ZOHO_SMTP_HOST}, se usa el hostname tal cual:`, err)
  }

  const transportOptions: SMTPTransport.Options & { servername?: string } = {
    host: smtpHost,
    servername: env.ZOHO_SMTP_HOST,
    port: env.ZOHO_SMTP_PORT,
    secure: env.ZOHO_SMTP_PORT === 465,
    auth: {
      user: env.ZOHO_SMTP_USER,
      pass: env.ZOHO_SMTP_PASSWORD,
    },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  }

  transporter = nodemailer.createTransport(transportOptions)
} else {
  console.warn('[mailer] ZOHO_SMTP_* no está configurado — el envío de correo queda deshabilitado hasta que se agregue.')
}

export interface ContactMailPayload {
  nombre: string
  correo: string
  telefono: string
  empresa?: string | null
  mensaje: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function notificationTemplate(payload: ContactMailPayload): string {
  const empresa = payload.empresa?.trim() ? escapeHtml(payload.empresa) : '—'
  return `
    <div style="font-family: Arial, sans-serif; color: #0B1A33; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">Nuevo mensaje desde el formulario de contacto</h2>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #5C5F78;">Nombre</td><td style="padding: 6px 0;">${escapeHtml(payload.nombre)}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5F78;">Correo</td><td style="padding: 6px 0;">${escapeHtml(payload.correo)}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5F78;">Teléfono</td><td style="padding: 6px 0;">${escapeHtml(payload.telefono)}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5F78;">Empresa</td><td style="padding: 6px 0;">${empresa}</td></tr>
      </table>
      <p style="margin: 16px 0 4px; color: #5C5F78;">Mensaje</p>
      <p style="white-space: pre-wrap; margin: 0; padding: 12px; background: #F7F6F1; border-radius: 6px;">${escapeHtml(payload.mensaje)}</p>
    </div>
  `
}

function autoReplyTemplate(payload: ContactMailPayload): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #0B1A33; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">¡Gracias por escribirnos, ${escapeHtml(payload.nombre)}!</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Recibimos tu mensaje y te contactaremos pronto para agendar tu diagnóstico inicial.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #5C5F78;">
        — Equipo RoMa Applied Science S.A.S.
      </p>
    </div>
  `
}

/** Nunca lanza — quien la llama decide qué hacer con `email_sent`. */
export async function sendContactNotification(payload: ContactMailPayload): Promise<boolean> {
  if (!transporter) return false
  try {
    await transporter.sendMail({
      from: `"RoMa — Formulario de contacto" <${env.ZOHO_SMTP_USER}>`,
      to: env.CONTACT_NOTIFICATION_EMAIL,
      replyTo: payload.correo,
      subject: `Nuevo contacto: ${payload.nombre}`,
      html: notificationTemplate(payload),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando notificación interna:', err)
    return false
  }
}

/** Best-effort — un fallo aquí no debe afectar el resultado de la request. */
export async function sendAutoReply(payload: ContactMailPayload): Promise<boolean> {
  if (!transporter) return false
  try {
    await transporter.sendMail({
      from: `"RoMa" <${env.ZOHO_SMTP_USER}>`,
      to: payload.correo,
      subject: 'Recibimos tu mensaje — RoMa',
      html: autoReplyTemplate(payload),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando auto-respuesta:', err)
    return false
  }
}
