import type { HigieneCategoria, PrismaClient } from '@prisma/client'

export function createServiceHeatmapRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findZonaById(id: string, organizationId: string) {
      return prisma.orgZona.findFirst({ where: { id, organizationId, isActive: true } })
    },

    findImages(organizationId: string, serviceId: string) {
      return prisma.serviceHeatmapImage.findMany({
        where: { organizationId, serviceId },
        select: { id: true, categoria: true, zonaId: true, imageBase64: true, updatedAt: true, zona: { select: { nombre: true } } },
        orderBy: [{ categoria: 'asc' }, { zona: { nombre: 'asc' } }],
      })
    },

    /** Upsert por (organizationId, serviceId, categoria, zonaId) — una sola
     * imagen vigente por esa combinación, cada carga nueva reemplaza la
     * anterior. */
    saveImage(input: {
      organizationId: string
      serviceId: string
      categoria: HigieneCategoria
      zonaId: string
      imageBase64: string
      uploadedById: string
    }) {
      return prisma.serviceHeatmapImage.upsert({
        where: {
          organizationId_serviceId_categoria_zonaId: {
            organizationId: input.organizationId,
            serviceId: input.serviceId,
            categoria: input.categoria,
            zonaId: input.zonaId,
          },
        },
        create: {
          organizationId: input.organizationId,
          serviceId: input.serviceId,
          categoria: input.categoria,
          zonaId: input.zonaId,
          imageBase64: input.imageBase64,
          uploadedById: input.uploadedById,
        },
        update: { imageBase64: input.imageBase64, uploadedById: input.uploadedById },
      })
    },
  }
}

export type ServiceHeatmapRepository = ReturnType<typeof createServiceHeatmapRepository>
