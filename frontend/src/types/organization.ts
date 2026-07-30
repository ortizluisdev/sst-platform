import { z } from 'zod'

export interface OrganizationFormMessages {
  nombreRequired: string
  nitInvalid: string
  contactEmailInvalid: string
  serviceRequired: string
  responsableDocumentInvalid: string
  responsableNombreRequired: string
  responsableEmailInvalid: string
  responsableCargoRequired: string
  responsableTelefonoRequired: string
  responsableTelefonoInvalid: string
}

/** Reglas espejo de backend/src/modules/organizations/organizations.schema.ts. */
export function createOrganizationSchema(messages: OrganizationFormMessages) {
  return z.object({
    nombre: z.string().min(2, messages.nombreRequired),
    nit: z.string().regex(/^\d{5,20}$/, messages.nitInvalid),
    contactEmail: z.string().email(messages.contactEmailInvalid),
    serviceSlug: z.string().min(1, messages.serviceRequired),
    responsable: z.object({
      documentType: z.enum(['CC', 'NIT']),
      documentNumber: z.string().regex(/^\d{5,20}$/, messages.responsableDocumentInvalid),
      nombre: z.string().min(2, messages.responsableNombreRequired),
      email: z.string().email(messages.responsableEmailInvalid),
      cargo: z.string().min(2, messages.responsableCargoRequired),
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

export interface UpdateOrganizationFormValues {
  nombre?: string
  nit?: string
  contactEmail?: string
  logoBase64?: string
  primaryColor?: string
  secondaryColor?: string
}
