import type { PrismaClient } from '@prisma/client'

export function createServiceHeatmapRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findImage(organizationId: string, serviceId: string) {
      return prisma.serviceHeatmapImage.findUnique({
        where: { organizationId_serviceId: { organizationId, serviceId } },
        select: { imageBase64: true, updatedAt: true },
      })
    },

    /** Upsert por (organizationId, serviceId) — una sola imagen vigente por
     * empresa+servicio, cada carga nueva reemplaza la anterior. */
    saveImage(input: { organizationId: string; serviceId: string; imageBase64: string; uploadedById: string }) {
      return prisma.serviceHeatmapImage.upsert({
        where: { organizationId_serviceId: { organizationId: input.organizationId, serviceId: input.serviceId } },
        create: {
          organizationId: input.organizationId,
          serviceId: input.serviceId,
          imageBase64: input.imageBase64,
          uploadedById: input.uploadedById,
        },
        update: { imageBase64: input.imageBase64, uploadedById: input.uploadedById },
      })
    },
  }
}

export type ServiceHeatmapRepository = ReturnType<typeof createServiceHeatmapRepository>
