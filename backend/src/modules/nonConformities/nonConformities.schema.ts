import { z } from 'zod'

export const createNonConformitySchema = z.object({
  descripcion: z.string().trim().min(3, 'La descripción es muy corta').max(2000),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).default('MEDIA'),
  variableNombre: z.string().trim().min(1, 'Selecciona una variable').max(255),
  zona: z.string().trim().max(255).optional(),
  workPointId: z.string().optional(),
  estado: z.enum(['ABIERTA', 'EN_SEGUIMIENTO', 'CERRADA']).default('ABIERTA'),
})

export const updateNonConformitySchema = z.object({
  descripcion: z.string().trim().min(3).max(2000).optional(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  estado: z.enum(['ABIERTA', 'EN_SEGUIMIENTO', 'CERRADA']).optional(),
})

export type CreateNonConformityInput = z.infer<typeof createNonConformitySchema>
export type UpdateNonConformityInput = z.infer<typeof updateNonConformitySchema>

export function formatFieldErrors(error: import('zod').ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
