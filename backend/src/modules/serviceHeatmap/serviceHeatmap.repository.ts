import type { HigieneCategoria, PrismaClient } from '@prisma/client'

export function createServiceHeatmapRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findZonaById(id: string, organizationId: string) {
      return prisma.orgZona.findFirst({ where: { id, organizationId, isActive: true } })
    },

    /** Categorías de Higiene Industrial deshabilitadas para esta
     * organización — mismo criterio que nonConformities.repository.ts's
     * findDisabledCategorias (único punto de filtrado, consistente con el
     * resto de la app: una categoría deshabilitada no debe verse ni
     * siquiera inspeccionando la API directamente). */
    async findDisabledCategorias(organizationId: string): Promise<HigieneCategoria[]> {
      const rows = await prisma.organizationCategoryConfig.findMany({
        where: { organizationId, habilitada: false },
      })
      return rows.map((r) => r.categoria)
    },

    findImages(organizationId: string, serviceId: string, disabledCategorias: HigieneCategoria[]) {
      return prisma.serviceHeatmapImage.findMany({
        where: {
          organizationId,
          serviceId,
          ...(disabledCategorias.length > 0 ? { NOT: { categoria: { in: disabledCategorias } } } : {}),
        },
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
