import type { PrismaClient } from '@prisma/client'

export function createOrganizationBrandingRepository(prisma: PrismaClient) {
  return {
    findOrganizationIdForUser(userId: string) {
      return prisma.userOrganization
        .findFirst({ where: { userId }, select: { organizationId: true } })
        .then((m) => m?.organizationId ?? null)
    },

    /** Update atómico y condicional: solo aplica si la organización todavía
     * no tiene branding guardado (primaryColor null) — así dos activaciones
     * casi simultáneas de la misma empresa nunca se pisan entre sí. Nunca
     * "leer y luego escribir" por separado — la condición vive en el WHERE. */
    async saveBrandingIfUnset(
      organizationId: string,
      data: { logoBase64: string; primaryColor: string; secondaryColor: string },
    ) {
      const result = await prisma.organization.updateMany({
        where: { id: organizationId, primaryColor: null },
        data,
      })
      return result.count > 0
    },

    clearMustUpdateProfile(userId: string) {
      return prisma.user.update({ where: { id: userId }, data: { mustUpdateProfile: false } })
    },

    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id }, select: { logoBase64: true } })
    },

    createAuditLog(input: { userId: string; organizationId: string; action: 'ORGANIZATION_BRANDING_SET' }) {
      return prisma.auditLog.create({
        data: { userId: input.userId, organizationId: input.organizationId, action: input.action },
      })
    },
  }
}

export type OrganizationBrandingRepository = ReturnType<typeof createOrganizationBrandingRepository>
