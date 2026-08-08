import type { PrismaClient, SemaphoreStatus, HigieneCategoria } from '@prisma/client'
import { createNonConformitiesRepository } from './nonConformities.repository.js'
import type { CreateNonConformityInput, UpdateNonConformityInput, ListNonConformitiesQuery } from './nonConformities.schema.js'

export class NonConformitiesError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND' | 'NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createNonConformitiesService(prisma: PrismaClient) {
  const repository = createNonConformitiesRepository(prisma)

  return {
    async list(organizationId: string, serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new NonConformitiesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const disabledCategorias = await repository.findDisabledCategorias(organizationId)
      return repository.findByOrgService(organizationId, service.id, disabledCategorias)
    },

    /** Catálogo de variables para el selector del formulario de creación
     * manual — ya filtrado por categorías habilitadas de esta organización. */
    async listVariableOptions(organizationId: string, serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new NonConformitiesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const disabledCategorias = await repository.findDisabledCategorias(organizationId)
      return repository.findVariableOptions(service.id, disabledCategorias)
    },

    async createManual(organizationId: string, serviceSlug: string, createdById: string, input: CreateNonConformityInput) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new NonConformitiesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const disabledCategorias = await repository.findDisabledCategorias(organizationId)
      const options = await repository.findVariableOptions(service.id, disabledCategorias)
      const variable = options.find((o) => o.id === input.variableDefinitionId)
      if (!variable) throw new NonConformitiesError('NOT_FOUND', 'Variable no encontrada o no disponible')
      return repository.createManual({
        organizationId,
        serviceId: service.id,
        createdById,
        descripcion: input.descripcion,
        prioridad: input.prioridad,
        variableNombre: variable.nombre,
        categoria: variable.categoria,
        zona: input.zona,
        workPointId: input.workPointId,
        estado: input.estado,
      })
    },

    async update(organizationId: string, id: string, input: UpdateNonConformityInput) {
      const result = await repository.update(id, organizationId, input)
      if (result.count === 0) throw new NonConformitiesError('NOT_FOUND', 'No conformidad no encontrada')
    },

    /** CRUD admin paginado — pestaña dedicada, y el resumen recortado de
     * Hoja 1 · Dashboard (pidiendo pageSize chico en vez de un método aparte). */
    async listPaginated(organizationId: string, serviceSlug: string, filters: ListNonConformitiesQuery) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new NonConformitiesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const disabledCategorias = await repository.findDisabledCategorias(organizationId)
      const { items, total } = await repository.findByOrgServicePaginated(
        organizationId,
        service.id,
        disabledCategorias,
        filters,
      )
      return {
        items,
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      }
    },

    async remove(organizationId: string, id: string) {
      const result = await repository.softDelete(id, organizationId)
      if (result.count === 0) throw new NonConformitiesError('NOT_FOUND', 'No conformidad no encontrada')
    },

    /** "Alertas activas" — llamado desde variables.service.ts getDashboard(),
     * mismo alcance (carga seleccionada) que el resto de Hoja 1 · Dashboard. */
    countActive(organizationId: string, serviceId: string, uploadId: string, fecha: Date) {
      return repository.countActive(organizationId, serviceId, uploadId, fecha)
    },

    /** Llamado desde variables.service.ts tras procesar una carga o corregir
     * una lectura — nunca desde el frontend. Si la lectura está fuera de
     * norma (AMARILLO/ROJO) crea o actualiza su fila AUTO; si vuelve VERDE,
     * cierra la que existiera. */
    async syncForReading(input: {
      readingId: string
      organizationId: string
      serviceId: string
      workPointId: string
      valor: number
      semaforo: SemaphoreStatus
      unidadMedida: string
      variableNombre: string
      categoria?: HigieneCategoria
      workPointNombre: string
      zona: string
    }) {
      if (input.semaforo === 'VERDE') {
        await repository.closeAutoForReading(input.readingId)
        return
      }
      await repository.upsertAuto({
        readingId: input.readingId,
        organizationId: input.organizationId,
        serviceId: input.serviceId,
        workPointId: input.workPointId,
        variableNombre: input.variableNombre,
        categoria: input.categoria,
        zona: input.zona,
        prioridad: input.semaforo === 'ROJO' ? 'ALTA' : 'MEDIA',
        descripcion: `${input.variableNombre} fuera de norma en "${input.workPointNombre}": ${input.valor} ${input.unidadMedida}.`,
      })
    },
  }
}

export type NonConformitiesService = ReturnType<typeof createNonConformitiesService>
