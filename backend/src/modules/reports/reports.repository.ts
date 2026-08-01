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

    /** Usuario que genera el reporte desde su sesión (el cliente) — su
     * firma (si la tiene cargada) va en el bloque "Firma cliente". */
    findFirmante(userId: string) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { nombre: true, cargo: true, firmaBase64: true },
      })
    },

    /** "Elaborado por" siempre lo firma el Super-Admin de la plataforma
     * (responsable técnico de RoMa), sin importar quién genera el reporte
     * — se busca por rol, no por documentNumber hardcodeado, para no
     * quedar atado a una cuenta concreta si el rol cambia de titular. */
    findSuperAdminFirmante() {
      return prisma.user.findFirst({
        where: { role: { name: 'super-admin' } },
        select: { nombre: true, cargo: true, firmaBase64: true },
      })
    },
  }
}

export type ReportsRepository = ReturnType<typeof createReportsRepository>
