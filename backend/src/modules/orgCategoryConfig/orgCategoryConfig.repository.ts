import type { HigieneCategoria, PrismaClient } from '@prisma/client'

export function createOrgCategoryConfigRepository(prisma: PrismaClient) {
  return {
    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id } })
    },

    list(organizationId: string) {
      return prisma.organizationCategoryConfig.findMany({
        where: { organizationId },
        orderBy: { categoria: 'asc' },
      })
    },

    /** Guardado inmediato al togglear (sin botón "Guardar" aparte) — mismo
     * patrón que el toggle global de Service.isActive en ServicesListView. */
    setHabilitada(organizationId: string, categoria: HigieneCategoria, habilitada: boolean) {
      return prisma.organizationCategoryConfig.upsert({
        where: { organizationId_categoria: { organizationId, categoria } },
        update: { habilitada },
        create: { organizationId, categoria, habilitada },
      })
    },
  }
}

export type OrgCategoryConfigRepository = ReturnType<typeof createOrgCategoryConfigRepository>
