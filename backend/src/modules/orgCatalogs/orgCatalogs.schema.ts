import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'

export const catalogTipoSchema = z.enum(['zona', 'seccion', 'cargo', 'trabajador'])
export type CatalogTipo = z.infer<typeof catalogTipoSchema>

export const catalogParamsSchema = z.object({
  organizationId: z.string().min(1),
  tipo: catalogTipoSchema,
})

export const catalogItemParamsSchema = catalogParamsSchema.extend({
  itemId: z.string().min(1),
})

export const createCatalogItemSchema = z.object({
  nombre: noNewlines(z.string().min(1, 'Ingresa un nombre').max(150)),
})

export const updateCatalogItemSchema = z
  .object({
    nombre: noNewlines(z.string().min(1).max(150)).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
