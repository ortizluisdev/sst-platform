import type { PrismaClient } from '@prisma/client'
import { createServicesRepository } from './services.repository.js'
import type { CreateServiceInput, UpdateServiceInput } from './services.schema.js'

export class ServicesError extends Error {
  constructor(
    public code: 'NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

const DIACRITIC_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

function slugify(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(DIACRITIC_MARKS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createServicesService(prisma: PrismaClient) {
  const repository = createServicesRepository(prisma)

  return {
    list(includeInactive: boolean) {
      return repository.list(includeInactive)
    },

    async create(input: CreateServiceInput, createdByUserId: string, ipAddress: string) {
      const base = slugify(input.nombre)
      const count = await repository.countSlugsStartingWith(base)
      const slug = count === 0 ? base : `${base}-${count + 1}`

      const service = await repository.create({ slug, nombre: input.nombre, descripcion: input.descripcion })

      await repository.createAuditLog({
        userId: createdByUserId,
        action: 'SERVICE_CREATED',
        metadata: { serviceId: service.id, slug: service.slug },
        ipAddress,
      })

      return service
    },

    async update(serviceId: string, input: UpdateServiceInput, updatedByUserId: string, ipAddress: string) {
      const existing = await repository.findById(serviceId)
      if (!existing) throw new ServicesError('NOT_FOUND', 'Servicio no encontrado')

      const service = await repository.update(serviceId, input)

      await repository.createAuditLog({
        userId: updatedByUserId,
        action: 'SERVICE_UPDATED',
        metadata: { serviceId: service.id, changes: input },
        ipAddress,
      })

      return service
    },
  }
}

export type ServicesService = ReturnType<typeof createServicesService>
