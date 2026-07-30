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
  }
}

export type OrganizationBrandingService = ReturnType<typeof createOrganizationBrandingService>
