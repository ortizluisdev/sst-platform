import { z } from 'zod'

export const uploadVariablesParamsSchema = z.object({
  organizationId: z.string().min(1),
  serviceSlug: z.string().min(1),
})

export const uploadVariablesFieldsSchema = z.object({
  fechaEvaluacion: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha de evaluación inválida'),
})

export const dashboardParamsSchema = z.object({
  serviceSlug: z.string().min(1),
})

export const adminDashboardParamsSchema = z.object({
  organizationId: z.string().min(1),
  serviceSlug: z.string().min(1),
})

export const uploadDetailParamsSchema = z.object({
  serviceSlug: z.string().min(1),
  uploadId: z.string().min(1),
})

export const adminUploadDetailParamsSchema = z.object({
  organizationId: z.string().min(1),
  serviceSlug: z.string().min(1),
  uploadId: z.string().min(1),
})

export const correctReadingParamsSchema = z.object({
  organizationId: z.string().min(1),
  serviceSlug: z.string().min(1),
  readingId: z.string().min(1),
})

export const correctReadingBodySchema = z.object({
  valor: z.number({ invalid_type_error: 'El valor debe ser un número' }),
  reason: z
    .string()
    .trim()
    .min(10, 'El motivo de la corrección debe tener al menos 10 caracteres'),
})

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
