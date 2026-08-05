import type { Prisma, PrismaClient, UpdateFrequency } from '@prisma/client'

export function createServicesRepository(prisma: PrismaClient) {
  return {
    list(includeInactive: boolean) {
      return prisma.service.findMany({
        where: includeInactive ? undefined : { isActive: true },
        select: {
          id: true,
          slug: true,
          nombre: true,
          descripcion: true,
          updateFrequency: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { nombre: 'asc' },
      })
    },

    findBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findById(id: string) {
      return prisma.service.findUnique({ where: { id } })
    },

    countSlugsStartingWith(slug: string) {
      return prisma.service.count({ where: { slug: { startsWith: slug } } })
    },

    create(data: { slug: string; nombre: string; descripcion?: string }) {
      return prisma.service.create({ data })
    },

    update(
      id: string,
      data: { nombre?: string; descripcion?: string | null; isActive?: boolean; updateFrequency?: UpdateFrequency },
    ) {
      return prisma.service.update({ where: { id }, data })
    },

    createAuditLog(input: {
      userId: string
      action: 'SERVICE_CREATED' | 'SERVICE_UPDATED'
      metadata?: Record<string, unknown>
      ipAddress?: string | null
    }) {
      return prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
          ipAddress: input.ipAddress,
        },
      })
    },
  }
}

export type ServicesRepository = ReturnType<typeof createServicesRepository>
