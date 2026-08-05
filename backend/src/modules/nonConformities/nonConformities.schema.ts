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

// --- Listado paginado admin (pestaña dedicada) --------------------------

export const listNonConformitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  estado: z.enum(['ABIERTA', 'EN_SEGUIMIENTO', 'CERRADA']).optional(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  origen: z.enum(['AUTO', 'MANUAL']).optional(),
  deletedOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  // 'prioridad' = ALTA primero, luego fecha más reciente — usado por el
  // resumen "más importantes" de Hoja 1 · Dashboard. Default 'fecha'
  // preserva el comportamiento de la pestaña dedicada (orden cronológico).
  sort: z.enum(['fecha', 'prioridad']).default('fecha'),
})

export type CreateNonConformityInput = z.infer<typeof createNonConformitySchema>
export type UpdateNonConformityInput = z.infer<typeof updateNonConformitySchema>
export type ListNonConformitiesQuery = z.infer<typeof listNonConformitiesQuerySchema>

export function formatFieldErrors(error: import('zod').ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
