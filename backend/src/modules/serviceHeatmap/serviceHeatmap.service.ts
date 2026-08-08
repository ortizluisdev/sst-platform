import type { HigieneCategoria, PrismaClient } from '@prisma/client'
import { createServiceHeatmapRepository } from './serviceHeatmap.repository.js'

export class ServiceHeatmapError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND' | 'ZONA_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createServiceHeatmapService(prisma: PrismaClient) {
  const repository = createServiceHeatmapRepository(prisma)

  return {
    async getImages(organizationId: string, serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new ServiceHeatmapError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const records = await repository.findImages(organizationId, service.id)
      return records.map((record) => ({
        id: record.id,
        categoria: record.categoria,
        zonaId: record.zonaId,
        zonaNombre: record.zona.nombre,
        imageBase64: record.imageBase64,
        updatedAt: record.updatedAt,
      }))
    },

    async saveImage(
      organizationId: string,
      serviceSlug: string,
      uploadedById: string,
      input: { categoria: HigieneCategoria; zonaId: string; imageBase64: string },
    ) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new ServiceHeatmapError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const zona = await repository.findZonaById(input.zonaId, organizationId)
      if (!zona) throw new ServiceHeatmapError('ZONA_NOT_FOUND', 'Zona no encontrada')
      await repository.saveImage({
        organizationId,
        serviceId: service.id,
        categoria: input.categoria,
        zonaId: input.zonaId,
        imageBase64: input.imageBase64,
        uploadedById,
      })
    },
  }
}

export type ServiceHeatmapService = ReturnType<typeof createServiceHeatmapService>
