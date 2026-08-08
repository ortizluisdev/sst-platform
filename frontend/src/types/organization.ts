import { z } from 'zod'

export interface OrganizationFormMessages {
  nombreRequired: string
  nombreNewlines: string
  nitInvalid: string
  contactEmailInvalid: string
  serviceRequired: string
  responsableDocumentInvalid: string
  responsableNombreRequired: string
  responsableCargoRequired: string
  responsableTelefonoRequired: string
  responsableTelefonoInvalid: string
}

// Mismo chequeo que noNewlines() en backend/src/utils/zodHelpers.ts — un
// campo de texto libre que puede terminar en un header de correo no debe
// admitir \r\n.
function noNewlines(schema: z.ZodString, message: string) {
  return schema.refine((value) => !/[\r\n]/.test(value), message)
}

/** Reglas espejo de backend/src/modules/organizations/organizations.schema.ts.
 * Un solo correo por empresa (contactEmail) — ya no se pide un email aparte
 * para el responsable, ver nota en el schema backend. logoBase64/colores son
 * opcionales: el admin los puede dejar pendientes y el cliente los completa
 * en su primer login. */
export function createOrganizationSchema(messages: OrganizationFormMessages) {
  return z.object({
    nombre: noNewlines(z.string().min(2, messages.nombreRequired), messages.nombreNewlines),
    nit: z.string().regex(/^\d{5,20}$/, messages.nitInvalid),
    contactEmail: z.string().email(messages.contactEmailInvalid),
    // Antes un solo serviceSlug — una empresa puede tener varios servicios
    // contratados activos desde el alta (checklist en el formulario).
    serviceSlugs: z.array(z.string()).min(1, messages.serviceRequired),
    // Se validan a mano en el composable (logoRequired) — acá solo se
    // tipan como string simple para que el v-model de BrandingFields.vue
    // (required) compile sin castings.
    logoBase64: z.string(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    responsable: z.object({
      documentType: z.enum(['CC', 'NIT']),
      documentNumber: z.string().regex(/^\d{5,20}$/, messages.responsableDocumentInvalid),
      nombre: noNewlines(z.string().min(2, messages.responsableNombreRequired), messages.nombreNewlines),
      cargo: noNewlines(z.string().min(2, messages.responsableCargoRequired), messages.nombreNewlines),
      telefono: z
        .string()
        .min(7, messages.responsableTelefonoRequired)
        .regex(/^[+()\d\s-]+$/, messages.responsableTelefonoInvalid),
    }),
  })
}

export type CreateOrganizationFormValues = z.infer<ReturnType<typeof createOrganizationSchema>>

export interface ServiceOption {
  slug: string
  nombre: string
}

export interface OrganizationResponsable {
  id: string
  nombre: string
  documentType: 'CC' | 'NIT'
  documentNumber: string
  email: string
  accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'
  suspendReason: string | null
}

export interface OrganizationContractedService {
  slug: string
  nombre: string
  isActive: boolean
}

export interface OrganizationListItem {
  id: string
  nombre: string
  nit: string | null
  contactEmail: string | null
  isActive: boolean
  primaryColor: string | null
  secondaryColor: string | null
  services: OrganizationContractedService[]
  responsable: OrganizationResponsable | null
}

/** Datos ADMINISTRATIVOS de empresa que el admin puede editar — logo/colores
 * quedan fuera a propósito: son personalización exclusiva del cliente, se
 * definen una sola vez al activar su cuenta (ver organizationBranding). */
export interface UpdateOrganizationFormValues {
  nombre?: string
  nit?: string
  contactEmail?: string
}
