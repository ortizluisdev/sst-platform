import { z } from 'zod'

const HEATMAP_MAX_BYTES = 3 * 1024 * 1024

export const HIGIENE_CATEGORIAS = ['ESTRES_TERMICO', 'ILUMINACION', 'SONIDO', 'RADIACION_UV', 'VIBRACION'] as const

export const heatmapImageSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|svg\+xml);base64,/, 'La imagen debe ser PNG, JPEG o SVG')
  .refine((value) => {
    const payload = value.split(',')[1] ?? ''
    return Buffer.byteLength(payload, 'base64') <= HEATMAP_MAX_BYTES
  }, 'La imagen no puede superar 3MB')

export const saveHeatmapSchema = z.object({
  categoria: z.enum(HIGIENE_CATEGORIAS, { errorMap: () => ({ message: 'Selecciona una categoría válida' }) }),
  zonaId: z.string().min(1, 'Selecciona una zona'),
  imageBase64: heatmapImageSchema,
})

export type SaveHeatmapInput = z.infer<typeof saveHeatmapSchema>

export function formatFieldErrors(error: import('zod').ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
