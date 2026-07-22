import type { PrismaClient, WorkShift } from '@prisma/client'
import { createVariablesRepository } from './variables.repository.js'
import { parseVariableFile, VariableFileParseError } from '../../utils/variableFileParser.js'
import { calculateSemaphore, type SemaphoreThresholds } from '../../utils/semaphore.js'

export class VariablesError extends Error {
  constructor(
    public code:
      | 'SERVICE_NOT_FOUND'
      | 'ORG_NOT_FOUND'
      | 'SERVICE_NOT_CONTRACTED'
      | 'INVALID_FILE'
      | 'UNKNOWN_VARIABLES'
      | 'UPLOAD_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

const VALID_SHIFTS: WorkShift[] = ['DIURNA', 'NOCTURNA', 'MIXTA']

function normalizeShift(value: string): WorkShift {
  return VALID_SHIFTS.includes(value as WorkShift) ? (value as WorkShift) : 'DIURNA'
}

export function createVariablesService(prisma: PrismaClient) {
  const repository = createVariablesRepository(prisma)

  return {
    /**
     * Sube y procesa un archivo de variables para una organización/servicio.
     * Valida el catálogo, calcula el semáforo, y guarda todo en una única
     * transacción (todo o nada). Solo debe llamarse tras verificar el rol
     * de super-admin en el controlador/ruta — esta función no vuelve a
     * verificar permisos, asume que ya se autorizó.
     */
    async uploadVariables(input: {
      organizationId: string
      serviceSlug: string
      uploadedById: string
      fechaEvaluacion: Date
      fileBuffer: Buffer
      filename: string
      ipAddress?: string
    }) {
      const organization = await repository.findOrganizationById(input.organizationId)
      if (!organization) throw new VariablesError('ORG_NOT_FOUND', 'Organización no encontrada')

      const service = await repository.findServiceBySlug(input.serviceSlug)
      if (!service) throw new VariablesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const orgService = await repository.findOrganizationService(input.organizationId, service.id)
      if (!orgService || !orgService.isActive) {
        throw new VariablesError('SERVICE_NOT_CONTRACTED', 'Esta organización no tiene contratado este servicio')
      }

      let rows
      try {
        rows = await parseVariableFile(input.fileBuffer, input.filename)
      } catch (err) {
        if (err instanceof VariableFileParseError) throw new VariablesError('INVALID_FILE', err.message)
        throw err
      }

      const definitions = await repository.findDefinitionsByService(service.id)
      const definitionByCode = new Map(definitions.map((d) => [d.codigo, d]))

      const unknownCodes = [...new Set(rows.map((r) => r.codigoVariable))].filter((c) => !definitionByCode.has(c))
      if (unknownCodes.length > 0) {
        throw new VariablesError(
          'UNKNOWN_VARIABLES',
          `El archivo contiene variables que no existen en el catálogo de "${service.nombre}": ${unknownCodes.join(', ')}`,
        )
      }

      const preparedRows = rows.map((row) => {
        const definition = definitionByCode.get(row.codigoVariable)!
        const semaforo = calculateSemaphore(row.valor, {
          comparisonType: definition.comparisonType,
          limiteMin: definition.limiteMin,
          limiteMax: definition.limiteMax,
          toleranciaAlerta: definition.toleranciaAlerta,
        })
        return {
          codigoPuesto: row.codigoPuesto,
          nombrePuesto: row.nombrePuesto,
          areaPlanta: row.areaPlanta,
          procesoActividad: row.procesoActividad,
          jornada: normalizeShift(row.jornada),
          definitionId: definition.id,
          valor: row.valor,
          semaforo,
        }
      })

      const upload = await repository.createUploadTransaction({
        organizationId: input.organizationId,
        serviceId: service.id,
        uploadedById: input.uploadedById,
        originalFile: input.filename,
        fechaEvaluacion: input.fechaEvaluacion,
        rows: preparedRows,
      })

      await repository.createAuditLog({
        userId: input.uploadedById,
        organizationId: input.organizationId,
        action: 'VARIABLES_UPLOADED',
        metadata: { serviceSlug: input.serviceSlug, uploadId: upload.id, filas: preparedRows.length },
        ipAddress: input.ipAddress,
      })

      return { uploadId: upload.id, filasProcesadas: preparedRows.length, puestosAfectados: new Set(rows.map((r) => r.codigoPuesto)).size }
    },

    /** Organizaciones con el servicio contratado — para el selector del super-admin. */
    async listOrganizationsForService(serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariablesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      return repository.findOrganizationsByService(service.id)
    },

    /** Datos agregados para el dashboard de un servicio de una organización. */
    async getDashboard(organizationId: string, serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariablesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const orgService = await repository.findOrganizationService(organizationId, service.id)
      if (!orgService || !orgService.isActive) {
        throw new VariablesError('SERVICE_NOT_CONTRACTED', 'Esta organización no tiene contratado este servicio')
      }

      const latestUpload = await repository.findLatestUpload(organizationId, service.id)
      const totalWorkPoints = await repository.countActiveWorkPoints(organizationId)

      if (!latestUpload) {
        return {
          service: { slug: service.slug, nombre: service.nombre, updateFrequency: service.updateFrequency },
          lastUpdated: null,
          totalWorkPoints,
          categories: [],
          globalCompliance: { pct: 0, verde: 0, amarillo: 0, rojo: 0, total: 0 },
          trend: [],
        }
      }

      const latestReadings = await repository.findReadingsByUpload(latestUpload.id)

      // Agrupa las lecturas más recientes por variable, para la tabla
      // comparativa y las 3 tarjetas resumen por categoría.
      const byDefinition = new Map<string, typeof latestReadings>()
      for (const reading of latestReadings) {
        const list = byDefinition.get(reading.definitionId) ?? []
        list.push(reading)
        byDefinition.set(reading.definitionId, list)
      }

      const categoriesMap = new Map<string, ReturnType<typeof buildVariableSummary>[]>()
      for (const readings of byDefinition.values()) {
        const definition = readings[0]!.definition
        const summary = buildVariableSummary(definition, readings)
        const list = categoriesMap.get(definition.categoria) ?? []
        list.push(summary)
        categoriesMap.set(definition.categoria, list)
      }

      const categories = [...categoriesMap.entries()].map(([categoria, variables]) => ({ categoria, variables }))

      const globalCompliance = {
        verde: latestReadings.filter((r) => r.semaforo === 'VERDE').length,
        amarillo: latestReadings.filter((r) => r.semaforo === 'AMARILLO').length,
        rojo: latestReadings.filter((r) => r.semaforo === 'ROJO').length,
        total: latestReadings.length,
      }
      const globalPct = globalCompliance.total > 0 ? Math.round((globalCompliance.verde / globalCompliance.total) * 100) : 0

      // Por VARIABLE, no por categoría: promediar lux con UGR con % no tiene
      // sentido físico (unidades distintas). El frontend arma el gráfico de
      // tendencia eligiendo una variable representativa por categoría.
      const allUploads = await repository.findUploadsWithReadings(organizationId, service.id)
      const trend = allUploads.map((upload) => {
        const byDefinitionCode = new Map<string, number[]>()
        for (const reading of upload.readings) {
          const list = byDefinitionCode.get(reading.definition.codigo) ?? []
          list.push(reading.valor)
          byDefinitionCode.set(reading.definition.codigo, list)
        }
        const promedios: Record<string, number> = {}
        for (const [codigo, valores] of byDefinitionCode) {
          promedios[codigo] = round2(valores.reduce((a, b) => a + b, 0) / valores.length)
        }
        return { fecha: upload.fechaEvaluacion.toISOString().slice(0, 10), promedios }
      })

      return {
        service: { slug: service.slug, nombre: service.nombre, updateFrequency: service.updateFrequency },
        lastUpdated: latestUpload.fechaEvaluacion,
        totalWorkPoints,
        categories,
        globalCompliance: { pct: globalPct, ...globalCompliance },
        trend,
      }
    },

    /** Historial de cargas de la pestaña Historial. */
    async listUploadHistory(organizationId: string, serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariablesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const uploads = await repository.findUploadHistory(organizationId, service.id)
      return uploads.map((upload) => ({
        id: upload.id,
        fechaEvaluacion: upload.fechaEvaluacion,
        createdAt: upload.createdAt,
        originalFile: upload.originalFile,
        status: upload.status,
        uploadedByNombre: upload.uploadedBy.nombre,
        totalLecturas: upload.readings.length,
        totalPuestos: new Set(upload.readings.map((r) => r.workPointId)).size,
      }))
    },

    /** Detalle de lecturas de una carga puntual — drill-down del historial. */
    async getUploadDetail(uploadId: string, organizationId: string) {
      const upload = await repository.findUploadDetail(uploadId, organizationId)
      if (!upload) throw new VariablesError('UPLOAD_NOT_FOUND', 'Carga no encontrada')

      return {
        id: upload.id,
        fechaEvaluacion: upload.fechaEvaluacion,
        createdAt: upload.createdAt,
        originalFile: upload.originalFile,
        status: upload.status,
        uploadedByNombre: upload.uploadedBy.nombre,
        readings: upload.readings.map((r) => ({
          workPointCodigo: r.workPoint.codigo,
          workPointNombre: r.workPoint.nombre,
          areaPlanta: r.workPoint.areaPlanta,
          variableCodigo: r.definition.codigo,
          variableNombre: r.definition.nombre,
          unidadMedida: r.definition.unidadMedida,
          valor: r.valor,
          semaforo: r.semaforo,
        })),
      }
    },
  }
}

function buildVariableSummary(
  definition: {
    id: string
    codigo: string
    nombre: string
    unidadMedida: string
    limiteMin: number | null
    limiteMax: number | null
    normativaRef: string | null
    comparisonType: SemaphoreThresholds['comparisonType']
    toleranciaAlerta: number
  },
  readings: {
    valor: number
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
    workPoint: { codigo: string; nombre: string; areaPlanta: string }
  }[],
) {
  const promedio = round2(readings.reduce((sum, r) => sum + r.valor, 0) / readings.length)
  const cumplen = readings.filter((r) => r.semaforo === 'VERDE').length
  const cumplimientoPct = Math.round((cumplen / readings.length) * 100)
  // El estado de la fila representa el promedio mostrado (la "Medición" de
  // la tabla comparativa), no el peor de los N puestos individuales — con
  // 20 puestos casi siempre hay alguno fuera de rango, y usar el peor caso
  // pintaría todo de rojo aunque el promedio esté saludable.
  const estado = calculateSemaphore(promedio, {
    comparisonType: definition.comparisonType,
    limiteMin: definition.limiteMin,
    limiteMax: definition.limiteMax,
    toleranciaAlerta: definition.toleranciaAlerta,
  })

  return {
    definitionId: definition.id,
    codigo: definition.codigo,
    nombre: definition.nombre,
    unidadMedida: definition.unidadMedida,
    limiteMin: definition.limiteMin,
    limiteMax: definition.limiteMax,
    normativaRef: definition.normativaRef,
    promedio,
    cumplimientoPct,
    estado,
    // Detalle por puesto de trabajo — alimenta la tabla de la pestaña de
    // categoría (ej. Iluminación), donde un higienista necesita ver cada
    // punto evaluado individualmente, no solo el promedio de la organización.
    readings: readings
      .map((r) => ({
        workPointCodigo: r.workPoint.codigo,
        workPointNombre: r.workPoint.nombre,
        areaPlanta: r.workPoint.areaPlanta,
        valor: r.valor,
        semaforo: r.semaforo,
      }))
      .sort((a, b) => a.workPointCodigo.localeCompare(b.workPointCodigo)),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type VariablesService = ReturnType<typeof createVariablesService>
