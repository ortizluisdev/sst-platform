import { z } from 'zod'

export const higieneCategoriaSchema = z.enum(['ESTRES_TERMICO', 'ILUMINACION', 'SONIDO', 'RADIACION_UV', 'VIBRACION'])

export const categoryConfigParamsSchema = z.object({
  organizationId: z.string().min(1),
})

export const categoryConfigItemParamsSchema = categoryConfigParamsSchema.extend({
  categoria: higieneCategoriaSchema,
})

export const updateCategoryConfigSchema = z.object({
  habilitada: z.boolean(),
})

export type UpdateCategoryConfigInput = z.infer<typeof updateCategoryConfigSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
