import type { PrismaClient } from '@prisma/client'

export function createReportsRepository(prisma: PrismaClient) {
  return {
    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id }, select: { id: true, nombre: true, nit: true } })
    },

    /** El responsable es el primer miembro de la organización (mismo
     * criterio que organizations.repository.ts listFull() — toda
     * organización se crea con exactamente uno). */
    findResponsable(organizationId: string) {
      return prisma.userOrganization.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
        select: { user: { select: { nombre: true, cargo: true } } },
      })
    },

    /** Usuario que genera el reporte — su firma (si la tiene cargada) va en
     * la sección "Firma y sello". */
    findElaboradoPor(userId: string) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { nombre: true, cargo: true, firmaBase64: true },
      })
    },
  }
}

export type ReportsRepository = ReturnType<typeof createReportsRepository>
