import { z } from 'zod'
import type { NotificationType } from '@prisma/client'
import { NOTIFICATION_TYPE_CONFIG } from '../notifications/notification-types.js'

// Solo los tipos que el usuario puede tocar — los emailForced (hoy solo
// SEMAFORO_CRITICO) ni siquiera aparecen acá, así que un intento de
// actualizarlos falla la validación del path param en vez de silenciarse.
const TOGGLEABLE_TYPES = Object.entries(NOTIFICATION_TYPE_CONFIG)
  .filter(([, config]) => !config.emailForced)
  .map(([type]) => type as NotificationType) as [NotificationType, ...NotificationType[]]

export const preferenceTypeParamsSchema = z.object({
  type: z.enum(TOGGLEABLE_TYPES),
})

export const updatePreferenceBodySchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
  })
  .refine((data) => data.inAppEnabled !== undefined || data.emailEnabled !== undefined, {
    message: 'No hay cambios para aplicar',
  })

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceBodySchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
