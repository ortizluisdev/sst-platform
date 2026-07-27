import { z } from 'zod'

export interface ProfileFormMessages {
  cargoRequired: string
  telefonoRequired: string
  telefonoInvalid: string
}

/** Reglas espejo de backend/src/modules/auth/auth.schema.ts (updateProfileSchema). */
export function createProfileSchema(messages: ProfileFormMessages) {
  return z.object({
    cargo: z.string().min(2, messages.cargoRequired),
    telefono: z
      .string()
      .min(7, messages.telefonoRequired)
      .regex(/^[+()\d\s-]+$/, messages.telefonoInvalid),
  })
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>
