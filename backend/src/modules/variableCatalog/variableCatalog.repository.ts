import type { Prisma, PrismaClient, VariableMeasurementType } from '@prisma/client'

export function createVariableCatalogRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findDefinitionsByService(serviceId: string) {
      return prisma.variableDefinition.findMany({
        where: { serviceId, isActive: true },
        orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
      })
    },

    findDefinitionById(id: string) {
      return prisma.variableDefinition.findUnique({ where: { id } })
    },

    update(
      id: string,
      data: { tipo?: VariableMeasurementType; instrumento?: string; incertidumbre?: string; simbolo?: string },
    ) {
      return prisma.variableDefinition.update({ where: { id }, data })
    },

    createAuditLog(input: {
      userId: string
      action: 'VARIABLE_DEFINITION_UPDATED'
      metadata: Prisma.InputJsonObject
      ipAddress?: string
    }) {
      return prisma.auditLog.create({
        data: { userId: input.userId, action: input.action, metadata: input.metadata, ipAddress: input.ipAddress },
      })
    },
  }
}

export type VariableCatalogRepository = ReturnType<typeof createVariableCatalogRepository>
