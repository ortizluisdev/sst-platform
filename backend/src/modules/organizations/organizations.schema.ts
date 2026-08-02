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

// Un solo correo por empresa — el de la organización (contactEmail) — que
// también queda como email del usuario responsable. Antes se pedían dos
// correos por separado (empresa + responsable), redundante para el caso de
// una sola cuenta por organización que ya asume el resto del código (ver
// "toda organización se crea con exactamente uno" en listFull()).
export const createOrganizationSchema = z.object({
  nombre: noNewlines(z.string().min(2, 'Ingresa el nombre de la empresa')),
  nit: nitSchema,
  contactEmail: z.string().email('Ingresa un correo de contacto válido'),
  // Antes un solo `serviceSlug` — una empresa puede tener varios servicios
  // contratados activos desde el alta, no solo uno (ver checklist en el
  // formulario del frontend).
  serviceSlugs: z.array(z.string().min(1)).min(1, 'Selecciona al menos un servicio'),
  // Obligatorio: "crear la empresa completa" incluye su identidad visual
  // desde el alta — el admin ya no deja el logo/colores pendientes para que
  // el cliente los complete después (ver activation.service.ts,
  // organizationAlreadyHasBranding, que sigue existiendo como red de
  // seguridad para organizaciones creadas antes de este cambio).
  logoBase64: logoBase64Schema,
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  responsable: z.object({
    documentType: z.enum(['CC', 'NIT']),
    documentNumber: documentNumberSchema,
    // Llega hasta el correo de invitación (ver utils/mailer.ts) — misma
    // protección que el resto del proyecto contra inyección de headers vía \r\n.
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre del responsable')),
    cargo: noNewlines(z.string().min(2, 'Ingresa el cargo del responsable')),
    telefono: telefonoSchema,
  }),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

// Logo/colores quedan fuera de la EDICIÓN a propósito (distinto de la
// creación, ver createOrganizationSchema arriba): una vez la empresa existe,
// es personalización exclusiva del cliente (ver organizationBranding.service.ts,
// saveBrandingIfUnset), nunca editable por el admin — evita que dos personas
// se pisen el mismo dato.
export const updateOrganizationSchema = z
  .object({
    nombre: noNewlines(z.string().min(2, 'Ingresa el nombre de la empresa')).optional(),
    nit: nitSchema.optional(),
    contactEmail: z.string().email('Ingresa un correo de contacto válido').optional(),
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
