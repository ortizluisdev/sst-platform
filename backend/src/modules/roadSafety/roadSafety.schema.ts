import { z } from 'zod'

export const organizationParamsSchema = z.object({
  organizationId: z.string().min(1),
})

export const correctFieldParamsSchema = z.object({
  organizationId: z.string().min(1),
  entityId: z.string().min(1),
})

// `value` llega tal cual del frontend (string/number/boolean/null) — la
// coerción real al tipo declarado del campo (fecha, entero, etc.) pasa por
// coerceFieldValue() en roadSafetyFieldSpecs.ts, no acá.
export const correctFieldBodySchema = z.object({
  field: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  reason: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
