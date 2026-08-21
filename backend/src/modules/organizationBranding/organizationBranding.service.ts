import type { PrismaClient } from '@prisma/client'
import { createOrganizationBrandingRepository } from './organizationBranding.repository.js'
import type { SaveBrandingInput } from './organizationBranding.schema.js'

export class OrganizationBrandingError extends Error {
  constructor(
    public code: 'NO_ORGANIZATION',
    message: string,
  ) {
    super(message)
  }
}

export function createOrganizationBrandingService(prisma: PrismaClient) {
  const repository = createOrganizationBrandingRepository(prisma)

  return {
    /** Guarda el branding la primera vez que una organización lo configura.
     * Si otro usuario de la misma empresa ya lo guardó primero (carrera entre
     * dos activaciones casi simultáneas), no sobreescribe nada — pero igual
     * limpia mustUpdateProfile del usuario que llamó, porque su empresa ya
     * cumplió el requisito, sea quien sea quien lo haya guardado. */
    async saveInitialBranding(userId: string, input: SaveBrandingInput) {
      const organizationId = await repository.findOrganizationIdForUser(userId)
      if (!organizationId) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Tu cuenta no pertenece a ninguna organización')
      }

      const applied = await repository.saveBrandingIfUnset(organizationId, input)
      await repository.clearMustUpdateProfile(userId)
      if (applied) {
        await repository.createAuditLog({ userId, organizationId, action: 'ORGANIZATION_BRANDING_SET' })
      }
      return { applied }
    },

    async getLogoForOrganization(organizationId: string) {
      const organization = await repository.findOrganizationById(organizationId)
      return organization?.logoBase64 ?? null
    },

    /** Lee el branding actual para precargar el formulario de edición — a
     * diferencia de saveInitialBranding, acá null es un estado válido (una
     * empresa vieja que nunca completó branding, o que RoMa creó a mano). */
    async getBrandingForUser(userId: string) {
      const organizationId = await repository.findOrganizationIdForUser(userId)
      if (!organizationId) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Tu cuenta no pertenece a ninguna organización')
      }
      const organization = await repository.findBrandingForOrganization(organizationId)
      return {
        logoBase64: organization?.logoBase64 ?? null,
        primaryColor: organization?.primaryColor ?? null,
        secondaryColor: organization?.secondaryColor ?? null,
      }
    },

    /** Edición deliberada posterior a la activación — a diferencia de
     * saveInitialBranding, siempre sobrescribe (no hay condición de
     * carrera que proteger acá, es una sola persona editando su propia
     * empresa desde Configuración). */
    async updateBrandingForUser(userId: string, input: SaveBrandingInput) {
      const organizationId = await repository.findOrganizationIdForUser(userId)
      if (!organizationId) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Tu cuenta no pertenece a ninguna organización')
      }
      await repository.updateBranding(organizationId, input)
      await repository.createAuditLog({ userId, organizationId, action: 'ORGANIZATION_BRANDING_UPDATED' })
    },

    /** Lectura por admin, dado un organizationId directo (a diferencia de
     * getBrandingForUser, que lo resuelve a partir del usuario logueado) —
     * usada por el botón "Marca" en Clientes. NO_ORGANIZATION acá significa
     * "esa empresa no existe", no "el usuario no tiene organización". */
    async getBrandingForOrganization(organizationId: string) {
      const organization = await repository.findBrandingForOrganization(organizationId)
      if (!organization) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Empresa no encontrada')
      }
      return {
        logoBase64: organization.logoBase64 ?? null,
        primaryColor: organization.primaryColor ?? null,
        secondaryColor: organization.secondaryColor ?? null,
      }
    },

    /** Edición por admin — siempre sobrescribe, igual que
     * updateBrandingForUser, pero con su propia acción de auditoría
     * (ORGANIZATION_BRANDING_UPDATED_BY_ADMIN) para distinguir en el rastro
     * quién hizo el cambio: el propio cliente o el admin. */
    async updateBrandingForOrganization(organizationId: string, input: SaveBrandingInput, adminUserId: string) {
      const organization = await repository.findBrandingForOrganization(organizationId)
      if (!organization) {
        throw new OrganizationBrandingError('NO_ORGANIZATION', 'Empresa no encontrada')
      }
      await repository.updateBranding(organizationId, input)
      await repository.createAuditLog({
        userId: adminUserId,
        organizationId,
        action: 'ORGANIZATION_BRANDING_UPDATED_BY_ADMIN',
      })
    },
  }
}

export type OrganizationBrandingService = ReturnType<typeof createOrganizationBrandingService>
