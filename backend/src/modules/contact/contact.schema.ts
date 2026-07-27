import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'

/**
 * Mantener sincronizado con frontend/src/types/contact.ts — mismas reglas de
 * validación. El backend es la fuente de verdad final: nunca confiar solo en
 * lo que ya validó el cliente.
 */
export const contactSchema = z.object({
  // "nombre" llega hasta el asunto del email de notificación (ver
  // utils/mailer.ts) — sin \r\n no hay forma de inyectar headers adicionales.
  nombre: noNewlines(z.string().min(2, 'Ingresa tu nombre completo')),
  correo: z.string().email('Ingresa un correo válido'),
  telefono: z
    .string()
    .min(7, 'Ingresa un teléfono válido')
    .regex(/^[+()\d\s-]+$/, 'Solo números, espacios y +()-'),
  empresa: z.string().optional().or(z.literal('')),
  mensaje: z.string().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)'),
  // Honeypot anti-spam: en un envío legítimo siempre llega vacío. El frontend
  // debe ocultar este campo con CSS (display:none), nunca con type="hidden" —
  // los bots evitan ese patrón con más facilidad que uno oculto por CSS.
  website: z.string().optional().default(''),
})

export type ContactInput = z.infer<typeof contactSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
