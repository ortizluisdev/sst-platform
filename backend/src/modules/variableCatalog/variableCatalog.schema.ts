import { z } from 'zod'

export const updateVariableDefinitionSchema = z
  .object({
    tipo: z.enum(['MEDICION', 'CALCULO', 'INSPECCION']).optional(),
    instrumento: z.string().trim().min(1, 'Ingresa el instrumento').max(255).optional(),
    incertidumbre: z.string().trim().min(1, 'Ingresa la incertidumbre').max(100).optional(),
    simbolo: z.string().trim().min(1, 'Ingresa el símbolo').max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type UpdateVariableDefinitionInput = z.infer<typeof updateVariableDefinitionSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
