import type { PrismaClient } from '@prisma/client'
import { createVariableCatalogRepository } from './variableCatalog.repository.js'
import type { UpdateVariableDefinitionInput } from './variableCatalog.schema.js'

export class VariableCatalogError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND' | 'VARIABLE_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createVariableCatalogService(prisma: PrismaClient) {
  const repository = createVariableCatalogRepository(prisma)

  return {
    async listByService(serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariableCatalogError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const definitions = await repository.findDefinitionsByService(service.id)

      const byCategory = new Map<string, typeof definitions>()
      for (const def of definitions) {
        const list = byCategory.get(def.categoria) ?? []
        list.push(def)
        byCategory.set(def.categoria, list)
      }

      return [...byCategory.entries()].map(([categoria, variables]) => ({
        categoria,
        variables: variables.map((v) => ({
          id: v.id,
          codigo: v.codigo,
          nombre: v.nombre,
          unidadMedida: v.unidadMedida,
          tipo: v.tipo,
          instrumento: v.instrumento,
          incertidumbre: v.incertidumbre,
          simbolo: v.simbolo,
        })),
      }))
    },

    async update(
      variableId: string,
      input: UpdateVariableDefinitionInput,
      updatedByUserId: string,
      ipAddress: string,
    ) {
      const existing = await repository.findDefinitionById(variableId)
      if (!existing) throw new VariableCatalogError('VARIABLE_NOT_FOUND', 'Variable no encontrada')

      const updated = await repository.update(variableId, input)

      await repository.createAuditLog({
        userId: updatedByUserId,
        action: 'VARIABLE_DEFINITION_UPDATED',
        metadata: { variableId, codigo: existing.codigo, changes: input },
        ipAddress,
      })

      return updated
    },
  }
}

export type VariableCatalogService = ReturnType<typeof createVariableCatalogService>
