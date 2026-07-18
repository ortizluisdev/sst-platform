import { z } from 'zod'

export interface ContactValidationMessages {
  nombreRequired: string
  correoInvalid: string
  telefonoRequired: string
  telefonoInvalid: string
  mensajeRequired: string
  consentRequired: string
}

export function createContactSchema(messages: ContactValidationMessages) {
  return z.object({
    nombre: z.string().min(2, messages.nombreRequired),
    correo: z.string().email(messages.correoInvalid),
    telefono: z
      .string()
      .min(7, messages.telefonoRequired)
      .regex(/^[+()\d\s-]+$/, messages.telefonoInvalid),
    empresa: z.string().optional().or(z.literal('')),
    mensaje: z.string().min(10, messages.mensajeRequired),
    consent: z.boolean().refine((value) => value === true, { message: messages.consentRequired }),
    // Honeypot anti-spam: un usuario real nunca lo ve ni lo llena (oculto vía
    // CSS en ContactoSection.vue, no vía type="hidden"). Se envía siempre junto
    // al resto del payload; el backend descarta silenciosamente cualquier envío
    // donde llegue con contenido.
    website: z.string().optional().default(''),
  })
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>
