import { z } from 'zod'

/** Metadatos por-reporte, provistos por quien lo genera — NUNCA persistidos
 * en Organization (mezclaría datos permanentes de perfil de empresa con
 * metadatos de un documento puntual, ver decisión de arquitectura). Todos
 * opcionales: si no se completan, el reporte los muestra como "—". */
export const reportMetadataSchema = z.object({
  direccion: z.string().trim().max(255).optional(),
  ciudad: z.string().trim().max(120).optional(),
  sede: z.string().trim().max(120).optional(),
  area: z.string().trim().max(120).optional(),
  periodoEvaluacion: z.string().trim().max(120).optional(),
  numeroInforme: z.string().trim().max(50).optional(),
  elaboradoPor: z.string().trim().max(255).optional(),
})

export const generatePdfSchema = z.object({
  tipo: z.enum(['basico', 'tecnico']),
  uploadId: z.string().optional(),
  metadata: reportMetadataSchema.default({}),
})

export const generateCsvSchema = z.object({
  uploadId: z.string().optional(),
})

export type ReportMetadata = z.infer<typeof reportMetadataSchema>
export type GeneratePdfInput = z.infer<typeof generatePdfSchema>
export type GenerateCsvInput = z.infer<typeof generateCsvSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
