import type { PrismaClient, SemaphoreStatus } from '@prisma/client'
import { createNonConformitiesRepository } from './nonConformities.repository.js'
import type { CreateNonConformityInput, UpdateNonConformityInput } from './nonConformities.schema.js'

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
      return repository.findByOrgService(organizationId, service.id)
    },

    async createManual(organizationId: string, serviceSlug: string, createdById: string, input: CreateNonConformityInput) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new NonConformitiesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      return repository.createManual({
        organizationId,
        serviceId: service.id,
        createdById,
        descripcion: input.descripcion,
        prioridad: input.prioridad,
        variableNombre: input.variableNombre,
        zona: input.zona,
        workPointId: input.workPointId,
        estado: input.estado,
      })
    },

    async update(organizationId: string, id: string, input: UpdateNonConformityInput) {
      const result = await repository.update(id, organizationId, input)
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
        zona: input.zona,
        prioridad: input.semaforo === 'ROJO' ? 'ALTA' : 'MEDIA',
        descripcion: `${input.variableNombre} fuera de norma en "${input.workPointNombre}": ${input.valor} ${input.unidadMedida}.`,
      })
    },
  }
}

export type NonConformitiesService = ReturnType<typeof createNonConformitiesService>
