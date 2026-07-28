import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'

export const createServiceSchema = z.object({
  nombre: noNewlines(z.string().min(2, 'Ingresa el nombre del servicio')),
  descripcion: noNewlines(z.string()).optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>

export const updateServiceSchema = z
  .object({
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre del servicio')).optional(),
    descripcion: noNewlines(z.string()).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
