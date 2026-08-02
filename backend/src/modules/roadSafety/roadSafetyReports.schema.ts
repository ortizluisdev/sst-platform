import { z } from 'zod'

export const reportMetadataSchema = z.object({
  sedePrincipal: z.string().trim().max(255).optional(),
  ciudad: z.string().trim().max(150).optional(),
  responsablePesv: z.string().trim().max(255).optional(),
  nivelPesv: z.string().trim().max(100).optional(),
  numeroInforme: z.string().trim().max(100).optional(),
  fechaCorte: z.string().trim().max(50).optional(),
})

export type ReportMetadata = z.infer<typeof reportMetadataSchema>

const tipoSchema = z.enum(['h1', 'h2', 'h3', 'h4'])
export type RoadSafetyReportTipo = z.infer<typeof tipoSchema>

export const generatePdfSchema = z.object({
  tipo: tipoSchema,
  metadata: reportMetadataSchema.default({}),
})

export const generateCsvSchema = z.object({
  tipo: tipoSchema,
})

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
