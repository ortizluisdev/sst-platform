import { z } from 'zod'
import { hexColorSchema, logoBase64Schema } from '../../utils/brandingSchema.js'

export const saveBrandingSchema = z.object({
  logoBase64: logoBase64Schema,
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
})

export type SaveBrandingInput = z.infer<typeof saveBrandingSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
