import type { PrismaClient, VariableMeasurementType, WorkShift } from '@prisma/client'
import { createVariablesRepository } from './variables.repository.js'
import { parseVariableFile, VariableFileParseError } from '../../utils/variableFileParser.js'
import { calculateSemaphore, type SemaphoreThresholds } from '../../utils/semaphore.js'
import { createNotificationService } from '../notifications/notifications.service.js'

interface CriticalReading {
  variable: string
  valor: number
  unidadMedida: string
  limiteMin: number | null
  limiteMax: number | null
  puesto: string
  areaPlanta: string
}

function normLabel(r: CriticalReading): string {
  if (r.limiteMin !== null && r.limiteMax !== null) return `${r.limiteMin} - ${r.limiteMax} ${r.unidadMedida}`
  if (r.limiteMax !== null) return `≤ ${r.limiteMax} ${r.unidadMedida}`
  if (r.limiteMin !== null) return `≥ ${r.limiteMin} ${r.unidadMedida}`
  return 'sin límite definido'
}

function escapeHtmlLocal(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildCriticalEmailBody(readings: CriticalReading[], serviceNombre: string): string {
  const rows = readings
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtmlLocal(r.variable)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtmlLocal(r.puesto)} (${escapeHtmlLocal(r.areaPlanta)})</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${r.valor} ${escapeHtmlLocal(r.unidadMedida)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtmlLocal(normLabel(r))}</td>
      </tr>`,
    )
    .join('')

  return `
    <p>Se detectaron <strong>${readings.length}</strong> resultado(s) fuera de norma en tu evaluación de <strong>${escapeHtmlLocal(serviceNombre)}</strong>:</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="text-align:left;color:#5C5F78;">
          <th style="padding:6px 8px;">Variable</th>
          <th style="padding:6px 8px;">Puesto</th>
          <th style="padding:6px 8px;">Valor medido</th>
          <th style="padding:6px 8px;">Límite normativo</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;">Te recomendamos revisar estos puntos con prioridad.</p>
  `
}

export class VariablesError extends Error {
  constructor(
    public code:
      | 'SERVICE_NOT_FOUND'
      | 'ORG_NOT_FOUND'
      | 'SERVICE_NOT_CONTRACTED'
      | 'INVALID_FILE'
      | 'UNKNOWN_VARIABLES'
      | 'UPLOAD_NOT_FOUND'
      | 'READING_NOT_FOUND',
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
  const notifications = createNotificationService(prisma)

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
        if (err instanceof VariableFileParseError) {
          await notifications.notify({
            type: 'CARGA_CON_ERROR',
            recipientIds: [input.uploadedById],
            toAdmins: true,
            message: `La carga de "${input.filename}" para "${organization.nombre}" falló: ${err.message}`,
            metadata: { filename: input.filename, serviceSlug: input.serviceSlug, error: err.message },
          })
          throw new VariablesError('INVALID_FILE', err.message)
        }
        throw err
      }

      const definitions = await repository.findDefinitionsByService(service.id)
      const definitionByCode = new Map(definitions.map((d) => [d.codigo, d]))

      const unknownCodes = [...new Set(rows.map((r) => r.codigoVariable))].filter((c) => !definitionByCode.has(c))
      if (unknownCodes.length > 0) {
        const message = `El archivo contiene variables que no existen en el catálogo de "${service.nombre}": ${unknownCodes.join(', ')}`
        await notifications.notify({
          type: 'CARGA_CON_ERROR',
          recipientIds: [input.uploadedById],
          toAdmins: true,
          message: `La carga de "${input.filename}" para "${organization.nombre}" falló: ${message}`,
          metadata: { filename: input.filename, serviceSlug: input.serviceSlug, unknownCodes },
        })
        throw new VariablesError('UNKNOWN_VARIABLES', message)
      }

      const criticalReadings: CriticalReading[] = []

      const preparedRows = rows.map((row) => {
        const definition = definitionByCode.get(row.codigoVariable)!
        const semaforo = calculateSemaphore(row.valor, {
          comparisonType: definition.comparisonType,
          limiteMin: definition.limiteMin,
          limiteMax: definition.limiteMax,
          toleranciaAlerta: definition.toleranciaAlerta,
        })
        if (semaforo === 'ROJO') {
          criticalReadings.push({
            variable: definition.nombre,
            valor: row.valor,
            unidadMedida: definition.unidadMedida,
            limiteMin: definition.limiteMin,
            limiteMax: definition.limiteMax,
            puesto: row.nombrePuesto,
            areaPlanta: row.areaPlanta,
          })
        }
        return {
          codigoPuesto: row.codigoPuesto,
          nombrePuesto: row.nombrePuesto,
          areaPlanta: row.areaPlanta,
          procesoActividad: row.procesoActividad,
          jornada: normalizeShift(row.jornada),
          codigoVariable: row.codigoVariable,
          definitionId: definition.id,
          valor: row.valor,
          semaforo,
        }
      })

      const existingUpload = await repository.findUploadByDate(input.organizationId, service.id, input.fechaEvaluacion)

      const puestosAfectados = new Set(rows.map((r) => r.codigoPuesto)).size
      let uploadId: string
      let filasNuevas: number
      let filasActualizadas: number
      let filasOmitidas: { workPointCodigo: string; codigoVariable: string }[]
      let modo: 'nueva' | 'actualizacion'

      if (!existingUpload) {
        const upload = await repository.createUploadTransaction({
          organizationId: input.organizationId,
          serviceId: service.id,
          uploadedById: input.uploadedById,
          originalFile: input.filename,
          fechaEvaluacion: input.fechaEvaluacion,
          rows: preparedRows,
        })
        uploadId = upload.id
        filasNuevas = preparedRows.length
        filasActualizadas = 0
        filasOmitidas = []
        modo = 'nueva'
      } else {
        const result = await repository.updateUploadTransaction({
          uploadId: existingUpload.id,
          organizationId: input.organizationId,
          rows: preparedRows,
        })
        uploadId = existingUpload.id
        filasNuevas = result.filasNuevas
        filasActualizadas = result.filasActualizadas
        filasOmitidas = result.filasOmitidas
        modo = 'actualizacion'
      }

      await repository.createAuditLog({
        userId: input.uploadedById,
        organizationId: input.organizationId,
        action: 'VARIABLES_UPLOADED',
        metadata: { serviceSlug: input.serviceSlug, uploadId, filas: preparedRows.length, modo },
        ipAddress: input.ipAddress,
      })

      const omitidasSuffix =
        filasOmitidas.length > 0 ? ` (${filasOmitidas.length} fila(s) omitida(s): ya corregidas manualmente)` : ''
      await notifications.notify({
        type: 'CARGA_PROCESADA',
        recipientIds: [input.uploadedById],
        message: `Tu carga de ${preparedRows.length} lectura(s) para "${service.nombre}" fue procesada correctamente${omitidasSuffix}.`,
        link: `/dashboard/historial/${uploadId}`,
        entityType: 'VARIABLE_UPLOAD',
        entityId: uploadId,
      })

      // Agrupado por CARGA (no por fila individual): una sola notificación
      // crítica por esta carga con todas las variables fuera de norma, para
      // no saturar al cliente/admin si varias lecturas del mismo archivo
      // caen en rojo a la vez (ver diagnóstico Fase 0).
      if (criticalReadings.length > 0) {
        await notifications.notify({
          type: 'SEMAFORO_CRITICO',
          organizationId: input.organizationId,
          toAdmins: true,
          message: `${criticalReadings.length} resultado(s) crítico(s) en "${service.nombre}" para "${organization.nombre}": ${criticalReadings
            .map((r) => `${r.variable} en "${r.puesto}" (${r.valor} ${r.unidadMedida})`)
            .join('; ')}`,
          metadata: { uploadId, serviceSlug: input.serviceSlug, criticalReadings },
          link: `/dashboard/historial/${uploadId}`,
          entityType: 'VARIABLE_UPLOAD',
          entityId: uploadId,
          emailSubject: `Alerta crítica — ${criticalReadings.length} resultado(s) fuera de norma en ${service.nombre}`,
          emailTitle: `Resultados críticos detectados en tu evaluación de ${service.nombre}`,
          emailBodyHtml: buildCriticalEmailBody(criticalReadings, service.nombre),
          emailLinkLabel: 'Ver resultados',
        })
      }

      return {
        uploadId,
        filasProcesadas: preparedRows.length,
        puestosAfectados,
        filasNuevas,
        filasActualizadas,
        filasOmitidas,
      }
    },

    /** Organizaciones con el servicio contratado — para el selector del super-admin. */
    async listOrganizationsForService(serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariablesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      return repository.findOrganizationsByService(service.id)
    },

    /** Servicios contratados de una organización — alimenta los sub-tabs de
     * "Operación" (Fase C). */
    async listContractedServices(organizationId: string) {
      const organization = await repository.findOrganizationById(organizationId)
      if (!organization) throw new VariablesError('ORG_NOT_FOUND', 'Organización no encontrada')
      const rows = await repository.findContractedServices(organizationId)
      return rows.map((r) => r.service)
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
        // Sin cargas todavía: en vez de un dashboard vacío, mostramos las
        // categorías del catálogo contratado en estado SIN_DATOS — la
        // organización ya sabe qué se le va a medir aunque aún no haya
        // resultados (ver ajuste post-lanzamiento, 2026-07-28).
        const definitions = await repository.findDefinitionsByService(service.id)
        const categoriesMap = new Map<string, ReturnType<typeof buildEmptyVariableSummary>[]>()
        for (const definition of definitions) {
          const list = categoriesMap.get(definition.categoria) ?? []
          list.push(buildEmptyVariableSummary(definition))
          categoriesMap.set(definition.categoria, list)
        }

        return {
          service: { slug: service.slug, nombre: service.nombre, updateFrequency: service.updateFrequency },
          lastUpdated: null,
          totalWorkPoints,
          categories: [...categoriesMap.entries()].map(([categoria, variables]) => ({ categoria, variables })),
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

    /** Corrige el valor de una lectura ya procesada. Recalcula el semáforo
     * con el mismo util que usa la carga original — nunca se recibe el
     * semáforo del frontend. organizationId viene siempre de la ruta
     * (validado por el permiso), nunca del cliente: se cruza contra el
     * organizationId real de la carga para evitar que un admin corrija una
     * lectura de una organización distinta a la que tiene abierta. */
    async correctReading(input: {
      readingId: string
      organizationId: string
      valor: number
      reason: string
      correctedByUserId: string
    }) {
      const reading = await repository.findReadingById(input.readingId)
      if (!reading || reading.upload.organizationId !== input.organizationId) {
        throw new VariablesError('READING_NOT_FOUND', 'Lectura no encontrada')
      }

      const semaforo = calculateSemaphore(input.valor, {
        comparisonType: reading.definition.comparisonType,
        limiteMin: reading.definition.limiteMin,
        limiteMax: reading.definition.limiteMax,
        toleranciaAlerta: reading.definition.toleranciaAlerta,
      })

      const updated = await repository.correctReading(input.readingId, {
        valor: input.valor,
        semaforo,
        correctedById: input.correctedByUserId,
        correctionReason: input.reason,
      })

      await repository.createAuditLog({
        userId: input.correctedByUserId,
        organizationId: input.organizationId,
        action: 'VARIABLE_READING_CORRECTED',
        metadata: {
          readingId: input.readingId,
          definitionId: reading.definitionId,
          workPointId: reading.workPointId,
          oldValue: reading.valor,
          newValue: input.valor,
          reason: input.reason,
        },
      })

      return updated
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
    tipo: VariableMeasurementType | null
  },
  readings: {
    id: string
    valor: number
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
    isCorrected: boolean
    correctionReason: string | null
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
    tipo: definition.tipo,
    promedio,
    cumplimientoPct,
    estado,
    // Detalle por puesto de trabajo — alimenta la tabla de la pestaña de
    // categoría (ej. Iluminación), donde un higienista necesita ver cada
    // punto evaluado individualmente, no solo el promedio de la organización.
    readings: readings
      .map((r) => ({
        id: r.id,
        workPointCodigo: r.workPoint.codigo,
        workPointNombre: r.workPoint.nombre,
        areaPlanta: r.workPoint.areaPlanta,
        valor: r.valor,
        semaforo: r.semaforo,
        isCorrected: r.isCorrected,
        correctionReason: r.correctionReason,
      }))
      .sort((a, b) => a.workPointCodigo.localeCompare(b.workPointCodigo)),
  }
}

/** Tarjeta placeholder para una variable del catálogo que aún no tiene
 * ninguna lectura cargada — mismo shape que buildVariableSummary, pero con
 * estado SIN_DATOS en vez de un semáforo calculado (no hay valor que
 * comparar contra la norma todavía). */
function buildEmptyVariableSummary(definition: {
  id: string
  codigo: string
  nombre: string
  unidadMedida: string
  limiteMin: number | null
  limiteMax: number | null
  normativaRef: string | null
  tipo: VariableMeasurementType | null
}) {
  return {
    definitionId: definition.id,
    codigo: definition.codigo,
    nombre: definition.nombre,
    unidadMedida: definition.unidadMedida,
    limiteMin: definition.limiteMin,
    limiteMax: definition.limiteMax,
    normativaRef: definition.normativaRef,
    tipo: definition.tipo,
    promedio: 0,
    cumplimientoPct: 0,
    estado: 'SIN_DATOS' as const,
    readings: [] as ReturnType<typeof buildVariableSummary>['readings'],
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type VariablesService = ReturnType<typeof createVariablesService>
