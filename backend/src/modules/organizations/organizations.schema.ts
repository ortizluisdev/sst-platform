import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'
import { hexColorSchema, logoBase64Schema } from '../../utils/brandingSchema.js'

// Solo dígitos, sin puntos ni guiones — mismo formato que documentNumber de
// login (ver auth.schema.ts). El NIT colombiano real incluye un dígito de
// verificación separado por guion en la UI, pero se normaliza a solo dígitos
// antes de enviar (ver frontend).
const nitSchema = z.string().regex(/^\d{5,20}$/, 'Ingresa un NIT válido (solo números)')
const documentNumberSchema = z.string().regex(/^\d{5,20}$/, 'Ingresa un número de documento válido')
// Mismo patrón que auth.schema.ts's updateProfileSchema.telefono.
const telefonoSchema = z
  .string()
  .min(7, 'Ingresa un teléfono válido')
  .regex(/^[+()\d\s-]+$/, 'Solo números, espacios y +()-')

export const createOrganizationSchema = z.object({
  nombre: noNewlines(z.string().min(2, 'Ingresa el nombre de la empresa')),
  nit: nitSchema,
  contactEmail: z.string().email('Ingresa un correo de contacto válido'),
  serviceSlug: z.string().min(1, 'Selecciona un servicio'),
  responsable: z.object({
    documentType: z.enum(['CC', 'NIT']),
    documentNumber: documentNumberSchema,
    // Llega hasta el correo de invitación (ver utils/mailer.ts) — misma
    // protección que el resto del proyecto contra inyección de headers vía \r\n.
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre del responsable')),
    email: z.string().email('Ingresa un correo válido'),
    cargo: noNewlines(z.string().min(2, 'Ingresa el cargo del responsable')),
    telefono: telefonoSchema,
  }),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z
  .object({
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre de la empresa')).optional(),
    nit: nitSchema.optional(),
    contactEmail: z.string().email('Ingresa un correo de contacto válido').optional(),
    logoBase64: logoBase64Schema.optional(),
    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  // Errores anidados de `responsable.*` — flatten() de zod solo da el nivel
  // raíz, así que los sacamos manualmente de fieldErrors por path completo.
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (path.startsWith('responsable.') && !errors[path]) errors[path] = issue.message
  }
  return errors
}
