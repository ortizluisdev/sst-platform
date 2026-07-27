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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Envoltorio único para TODO correo transaccional del sistema — logo +
 * franja de contenido + footer con datos de contacto reales (mismo correo y
 * WhatsApp que usa el sitio público). Cada plantilla específica solo arma su
 * `bodyHtml`, nunca repite el shell HTML completo.
 */
function emailLayout(bodyHtml: string): string {
  const logoUrl = `${env.FRONTEND_URL}/email-logo.png`
  const whatsappLink = env.CONTACT_WHATSAPP_NUMBER
    ? ` · <a href="https://wa.me/${env.CONTACT_WHATSAPP_NUMBER}" style="color:#2454FF; text-decoration:none;">WhatsApp</a>`
    : ''

  return `
    <div style="font-family: Arial, sans-serif; color: #0B1A33; max-width: 560px; margin: 0 auto; padding: 24px 0;">
      <div style="text-align:center; margin-bottom: 28px;">
        <img src="${logoUrl}" alt="RoMa Applied Science" width="160" style="display:inline-block; border:0;" />
      </div>
      ${bodyHtml}
      <hr style="border:none; border-top:1px solid #E5E1D8; margin: 32px 0 16px;" />
      <p style="font-size: 12px; line-height: 1.7; color: #5C5F78; text-align:center; margin: 0;">
        RoMa Applied Science S.A.S.<br />
        <a href="mailto:${env.CONTACT_NOTIFICATION_EMAIL}" style="color:#2454FF; text-decoration:none;">${env.CONTACT_NOTIFICATION_EMAIL}</a>${whatsappLink}
      </p>
    </div>
  `
}

export interface ContactMailPayload {
  nombre: string
  correo: string
  telefono: string
  empresa?: string | null
  mensaje: string
}

function contactNotificationBody(payload: ContactMailPayload): string {
  const empresa = payload.empresa?.trim() ? escapeHtml(payload.empresa) : '—'
  return `
    <h2 style="margin: 0 0 16px;">Nuevo mensaje desde el formulario de contacto</h2>
    <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #5C5F78;">Nombre</td><td style="padding: 6px 0;">${escapeHtml(payload.nombre)}</td></tr>
      <tr><td style="padding: 6px 0; color: #5C5F78;">Correo</td><td style="padding: 6px 0;">${escapeHtml(payload.correo)}</td></tr>
      <tr><td style="padding: 6px 0; color: #5C5F78;">Teléfono</td><td style="padding: 6px 0;">${escapeHtml(payload.telefono)}</td></tr>
      <tr><td style="padding: 6px 0; color: #5C5F78;">Empresa</td><td style="padding: 6px 0;">${empresa}</td></tr>
    </table>
    <p style="margin: 16px 0 4px; color: #5C5F78;">Mensaje</p>
    <p style="white-space: pre-wrap; margin: 0; padding: 12px; background: #F7F6F1; border-radius: 6px;">${escapeHtml(payload.mensaje)}</p>
  `
}

function autoReplyBody(payload: ContactMailPayload): string {
  return `
    <h2 style="margin: 0 0 16px;">¡Gracias por escribirnos, ${escapeHtml(payload.nombre)}!</h2>
    <p style="font-size: 14px; line-height: 1.6;">
      Recibimos tu mensaje y te contactaremos pronto para agendar tu diagnóstico inicial.
    </p>
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
      html: emailLayout(contactNotificationBody(payload)),
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
      html: emailLayout(autoReplyBody(payload)),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando auto-respuesta:', err)
    return false
  }
}

function passwordResetBody(nombre: string, resetUrl: string): string {
  return `
    <h2 style="margin: 0 0 16px;">Restablece tu contraseña</h2>
    <p style="font-size: 14px; line-height: 1.6;">Hola ${escapeHtml(nombre)},</p>
    <p style="font-size: 14px; line-height: 1.6;">
      Recibimos una solicitud para restablecer tu contraseña. Este enlace es
      válido por 1 hora y solo se puede usar una vez.
    </p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="background:#2454FF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Restablecer contraseña</a>
    </p>
    <p style="font-size: 13px; line-height: 1.6; color: #5C5F78;">
      Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual sigue siendo válida.
    </p>
  `
}

/** Best-effort — un fallo aquí no debe revelar si el documento existe o no. */
export async function sendPasswordResetEmail(email: string, nombre: string, resetUrl: string): Promise<boolean> {
  if (!transporter) return false
  try {
    await transporter.sendMail({
      from: `"RoMa" <${env.ZOHO_SMTP_USER}>`,
      to: email,
      subject: 'Restablece tu contraseña — RoMa',
      html: emailLayout(passwordResetBody(nombre, resetUrl)),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando correo de reset de contraseña:', err)
    return false
  }
}

export type NotificationEmailSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

const SEVERITY_STYLES: Record<NotificationEmailSeverity, { accent: string; bg: string; label: string; icon: string }> = {
  CRITICAL: { accent: '#C81E3A', bg: '#FDECEF', label: 'Alerta crítica', icon: '⚠' },
  WARNING: { accent: '#B7791F', bg: '#FEF3E2', label: 'Aviso', icon: '●' },
  INFO: { accent: '#2454FF', bg: '#EAF0FF', label: 'Notificación', icon: 'ℹ' },
}

/**
 * Cuerpo con variante visual por severidad — un correo de "semáforo
 * crítico" se ve inconfundiblemente distinto a uno de "carga procesada".
 * `linkUrl` es opcional (ej. CONTACTO_RECIBIDO no tiene una entidad para
 * enlazar). El shell (logo/footer) lo pone `emailLayout`, no esta función.
 */
function severityEmailBody(payload: {
  nombre: string
  title: string
  bodyHtml: string
  severity: NotificationEmailSeverity
  linkUrl?: string | null
  linkLabel?: string
}): string {
  const style = SEVERITY_STYLES[payload.severity]
  const button = payload.linkUrl
    ? `<p style="margin: 24px 0;">
        <a href="${payload.linkUrl}" style="background:${style.accent};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          ${escapeHtml(payload.linkLabel ?? 'Ver detalles')}
        </a>
      </p>`
    : ''

  return `
    <div style="background:${style.bg}; border-left: 4px solid ${style.accent}; padding: 10px 16px; border-radius: 4px; margin-bottom: 20px;">
      <span style="color:${style.accent}; font-weight:700; font-size: 13px; letter-spacing: 0.02em;">${style.icon} ${style.label.toUpperCase()}</span>
    </div>
    <h2 style="margin: 0 0 16px; color: ${style.accent};">${escapeHtml(payload.title)}</h2>
    <p style="font-size: 14px; line-height: 1.6;">Hola ${escapeHtml(payload.nombre)},</p>
    <div style="font-size: 14px; line-height: 1.6;">${payload.bodyHtml}</div>
    ${button}
  `
}

/** Nunca lanza — el email es un canal aditivo, un fallo no debe perder ni
 * afectar la notificación in-app ya creada. Quien la llama registra el
 * resultado (emailSentAt/emailError) por separado. */
export async function sendNotificationEmail(payload: {
  to: string
  nombre: string
  subject: string
  title: string
  bodyHtml: string
  severity: NotificationEmailSeverity
  linkUrl?: string | null
  linkLabel?: string
}): Promise<boolean> {
  if (!transporter) return false
  try {
    await transporter.sendMail({
      from: `"RoMa+" <${env.ZOHO_SMTP_USER}>`,
      to: payload.to,
      subject: payload.subject,
      html: emailLayout(severityEmailBody(payload)),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando notificación de evento:', err)
    return false
  }
}

/** Best-effort — un fallo al enviar no debe tumbar la creación de la
 * empresa/usuario ya hecha (ver activation.service.ts, que además guarda
 * `emailSentAt`/`emailError` del intento). */
export async function sendActivationInviteEmail(payload: {
  to: string
  nombre: string
  organizationNombre?: string | null
  activationUrl: string
  ttlHours: number
}): Promise<boolean> {
  if (!transporter) return false
  try {
    const empresaLine = payload.organizationNombre
      ? `<p style="font-size: 14px; line-height: 1.6;">Te invitamos como responsable de <strong>${escapeHtml(payload.organizationNombre)}</strong> en RoMa+.</p>`
      : ''
    const body = severityEmailBody({
      nombre: payload.nombre,
      title: 'Activa tu cuenta en RoMa+',
      severity: 'INFO',
      bodyHtml: `
        ${empresaLine}
        <p style="font-size: 14px; line-height: 1.6;">
          Crea tu contraseña para empezar a usar tu panel de indicadores. Este
          enlace es válido por ${payload.ttlHours} horas y solo se puede usar una vez.
        </p>
      `,
      linkUrl: payload.activationUrl,
      linkLabel: 'Crear contraseña',
    })
    await transporter.sendMail({
      from: `"RoMa+" <${env.ZOHO_SMTP_USER}>`,
      to: payload.to,
      subject: 'Activa tu cuenta en RoMa+',
      html: emailLayout(body),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando invitación de activación:', err)
    return false
  }
}

/** Best-effort — confirmación de que la cuenta ya puede iniciar sesión. */
export async function sendAccountActiveEmail(payload: { to: string; nombre: string; documentNumber: string }): Promise<boolean> {
  if (!transporter) return false
  try {
    const body = severityEmailBody({
      nombre: payload.nombre,
      title: 'Tu cuenta ya está activa',
      severity: 'INFO',
      bodyHtml: `
        <p style="font-size: 14px; line-height: 1.6;">
          Ya puedes iniciar sesión en RoMa+ con tu número de documento
          (<strong>${escapeHtml(payload.documentNumber)}</strong>) y la contraseña que acabas de crear.
        </p>
      `,
      linkUrl: `${env.FRONTEND_URL}/ingresar`,
      linkLabel: 'Iniciar sesión',
    })
    await transporter.sendMail({
      from: `"RoMa+" <${env.ZOHO_SMTP_USER}>`,
      to: payload.to,
      subject: 'Tu cuenta en RoMa+ ya está activa',
      html: emailLayout(body),
    })
    return true
  } catch (err) {
    console.error('[mailer] Error enviando confirmación de cuenta activa:', err)
    return false
  }
}
