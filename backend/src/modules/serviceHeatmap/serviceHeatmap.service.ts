import type { PrismaClient } from '@prisma/client'
import { createServiceHeatmapRepository } from './serviceHeatmap.repository.js'

export class ServiceHeatmapError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createServiceHeatmapService(prisma: PrismaClient) {
  const repository = createServiceHeatmapRepository(prisma)

  return {
    async getImage(organizationId: string, serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new ServiceHeatmapError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const record = await repository.findImage(organizationId, service.id)
      return { imageBase64: record?.imageBase64 ?? null, updatedAt: record?.updatedAt ?? null }
    },

    async saveImage(organizationId: string, serviceSlug: string, uploadedById: string, imageBase64: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new ServiceHeatmapError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      await repository.saveImage({ organizationId, serviceId: service.id, imageBase64, uploadedById })
    },
  }
}

export type ServiceHeatmapService = ReturnType<typeof createServiceHeatmapService>
