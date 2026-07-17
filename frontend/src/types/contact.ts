import { z } from 'zod'

export interface ContactValidationMessages {
  nombreRequired: string
  correoInvalid: string
  telefonoRequired: string
  telefonoInvalid: string
  mensajeRequired: string
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
  })
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>
