import type { PrismaClient, VariableMeasurementType, WorkShift } from '@prisma/client'
import ExcelJS from 'exceljs'
import { createVariablesRepository } from './variables.repository.js'
import { parseVariableFile, VariableFileParseError } from '../../utils/variableFileParser.js'
import { parseVariableReportWorkbook } from '../../utils/variableReportWorkbookParser.js'
import { calculateSemaphore, type SemaphoreThresholds } from '../../utils/semaphore.js'
import { calculateRiskRatio, classifyRiskRatio, averageRiskLevel, type RiskLevel } from '../../utils/riskLevel.js'
import {
  CATEGORIAS_RIESGO_SALUD,
  CODIGO_TIEMPO_EXPOSICION_POR_CATEGORIA,
  calculatePuntajeIntervencion,
  classifyIntervencionPrioridad,
  classifyMatrizPosicion,
} from '../../utils/interventionAnalysis.js'
import {
  computeUploadCompliancePct,
  computeTendenciaGlobal,
  computeEvolucionIgho,
  computeProbabilidadIncumplimiento,
  type PeriodPoint,
} from '../../utils/trendAnalysis.js'
import { createNotificationService } from '../notifications/notifications.service.js'
import { createNonConformitiesService } from '../nonConformities/nonConformities.service.js'

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
      | 'READING_NOT_FOUND'
      | 'CATALOG_ITEM_NOT_FOUND',
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
  const nonConformities = createNonConformitiesService(prisma)

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
      zonaId: string
      seccionId: string
      cargoId: string
      trabajadorId: string
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

      // Anti-IDOR: los 4 ids deben pertenecer a ESTA organización — nunca
      // confiar en que un id de catálogo que llega del frontend es válido
      // solo porque tiene forma de cuid.
      const [zona, seccion, cargo, trabajador] = await Promise.all([
        repository.findZonaById(input.zonaId, input.organizationId),
        repository.findSeccionById(input.seccionId, input.organizationId),
        repository.findCargoById(input.cargoId, input.organizationId),
        repository.findTrabajadorById(input.trabajadorId, input.organizationId),
      ])
      if (!zona) throw new VariablesError('CATALOG_ITEM_NOT_FOUND', 'Zona no encontrada')
      if (!seccion) throw new VariablesError('CATALOG_ITEM_NOT_FOUND', 'Sección no encontrada')
      if (!cargo) throw new VariablesError('CATALOG_ITEM_NOT_FOUND', 'Cargo no encontrado')
      if (!trabajador) throw new VariablesError('CATALOG_ITEM_NOT_FOUND', 'Trabajador no encontrado')

      const esXlsx = !input.filename.toLowerCase().endsWith('.csv')
      let rows: { codigoPuesto: string; nombrePuesto: string; areaPlanta: string; procesoActividad: string; jornada: string; codigoVariable: string; valor: number }[]
      let origen: 'CSV' | 'REPORTE_EXCEL' = 'CSV'
      let fechaEvaluacionFinal = input.fechaEvaluacion
      let filasOmitidasFormato: { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' }[] = []

      try {
        let esReporteExcel = false
        let workbookCargado: ExcelJS.Workbook | null = null
        if (esXlsx) {
          workbookCargado = new ExcelJS.Workbook()
          await workbookCargado.xlsx.load(input.fileBuffer as any)
          esReporteExcel = workbookCargado.worksheets.some((ws) => ws.name === 'Reporte Hoja 2')
        }

        if (esReporteExcel && workbookCargado) {
          const parsed = parseVariableReportWorkbook(workbookCargado)
          const nombrePuesto = parsed.empresa ? `Evaluación general — ${parsed.empresa}` : 'Evaluación general'
          rows = parsed.rows.map((r) => ({
            codigoPuesto: 'EVAL-GENERAL',
            nombrePuesto,
            areaPlanta: 'General',
            procesoActividad: 'Evaluación higiénica general',
            jornada: 'DIURNA',
            codigoVariable: r.codigoVariable,
            valor: r.valor,
          }))
          origen = 'REPORTE_EXCEL'
          // Trunca a medianoche (solo la fecha, no la hora exacta) — así,
          // si se sube este mismo formato dos veces el mismo día, la
          // restricción única (organización+servicio+fecha) hace que la
          // segunda carga actualice la primera en vez de duplicarla,
          // igual que ya pasa con el formato CSV plano.
          fechaEvaluacionFinal = new Date(new Date().toISOString().slice(0, 10))
          filasOmitidasFormato = parsed.omitidas
        } else {
          const parsed = await parseVariableFile(input.fileBuffer, input.filename)
          rows = parsed.rows
          filasOmitidasFormato = parsed.omitidas
        }
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

      // Una variable sin código equivalente en el catálogo YA NO rechaza el
      // archivo entero (comportamiento viejo, distinto — e inconsistente —
      // del importador de "Reporte Hoja 2", que siempre omitió y siguió):
      // se deja fuera esa fila puntual, se reporta en `filasOmitidasFormato`
      // con el mismo motivo 'sin_variable_equivalente', y se sigue con el
      // resto. Solo se rechaza si NINGUNA fila del archivo es utilizable.
      const rowsConCatalogo = rows.filter((r) => definitionByCode.has(r.codigoVariable))
      const rowsSinCatalogo = rows.filter((r) => !definitionByCode.has(r.codigoVariable))
      for (const row of rowsSinCatalogo) {
        filasOmitidasFormato.push({
          nombre: `${row.nombrePuesto || row.codigoPuesto} — ${row.codigoVariable}`,
          motivo: 'sin_variable_equivalente',
        })
      }
      rows = rowsConCatalogo

      if (rows.length === 0) {
        const message = `Ninguna fila del archivo coincide con el catálogo de variables de "${service.nombre}".`
        await notifications.notify({
          type: 'CARGA_CON_ERROR',
          recipientIds: [input.uploadedById],
          toAdmins: true,
          message: `La carga de "${input.filename}" para "${organization.nombre}" falló: ${message}`,
          metadata: { filename: input.filename, serviceSlug: input.serviceSlug, omitidas: filasOmitidasFormato },
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

      // Cada carga es SIEMPRE un período nuevo en el historial, sin importar
      // si la fecha de evaluación coincide con una carga anterior — antes se
      // fusionaba con la carga existente de esa misma fecha (para no
      // "perder" correcciones manuales), pero eso hacía que subidas de
      // prueba repetidas con la misma fecha desaparecieran del Historial en
      // vez de acumularse. Decisión explícita: nunca ocultar una carga.
      const puestosAfectados = new Set(rows.map((r) => r.codigoPuesto)).size
      const upload = await repository.createUploadTransaction({
        organizationId: input.organizationId,
        serviceId: service.id,
        uploadedById: input.uploadedById,
        originalFile: input.filename,
        fechaEvaluacion: fechaEvaluacionFinal,
        origen,
        zonaId: input.zonaId,
        seccionId: input.seccionId,
        cargoId: input.cargoId,
        trabajadorId: input.trabajadorId,
        rows: preparedRows,
        omittedRows: filasOmitidasFormato.length > 0 ? filasOmitidasFormato : null,
      })
      const uploadId = upload.id
      const filasNuevas = preparedRows.length
      const filasActualizadas = 0
      const filasOmitidas: { workPointCodigo: string; codigoVariable: string }[] = []
      const modo = 'nueva' as const

      await repository.createAuditLog({
        userId: input.uploadedById,
        organizationId: input.organizationId,
        action: 'VARIABLES_UPLOADED',
        metadata: { serviceSlug: input.serviceSlug, uploadId, filas: preparedRows.length, modo },
        ipAddress: input.ipAddress,
      })

      // Efecto secundario posterior a la transacción (mismo patrón que las
      // notificaciones de abajo): una fila de "no conformidad" automática
      // por cada lectura fuera de norma, para alimentar la tabla
      // Recomendaciones/No conformidades del dashboard sin que el admin
      // tenga que redactarlas todas a mano.
      const readingsForSync = await repository.findReadingsForUpload(uploadId)
      for (const reading of readingsForSync) {
        await nonConformities.syncForReading({
          readingId: reading.id,
          organizationId: input.organizationId,
          serviceId: service.id,
          workPointId: reading.workPointId,
          valor: reading.valor,
          semaforo: reading.semaforo,
          unidadMedida: reading.definition.unidadMedida,
          variableNombre: reading.definition.nombre,
          workPointNombre: reading.workPoint.nombre,
          zona: reading.workPoint.areaPlanta,
        })
      }

      const totalOmitidas = filasOmitidas.length + filasOmitidasFormato.length
      const omitidasSuffix = totalOmitidas > 0 ? ` (${totalOmitidas} fila(s) con observaciones — revisa el detalle de la carga)` : ''
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
        filasOmitidas: [...filasOmitidas, ...filasOmitidasFormato],
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

    /** Datos agregados para el dashboard de un servicio de una organización.
     * `filters` es siempre opcional y aditivo: si el llamador (admin) nunca
     * los envía, el comportamiento es idéntico al de antes — el filtrado
     * real (área de planta / proceso-actividad / carga puntual) solo se
     * activa cuando el frontend cliente lo pide explícitamente. */
    async getDashboard(
      organizationId: string,
      serviceSlug: string,
      filters: { uploadId?: string; areaPlanta?: string; procesoActividad?: string } = {},
    ) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariablesError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const orgService = await repository.findOrganizationService(organizationId, service.id)
      if (!orgService || !orgService.isActive) {
        throw new VariablesError('SERVICE_NOT_CONTRACTED', 'Esta organización no tiene contratado este servicio')
      }

      const totalWorkPoints = await repository.countActiveWorkPoints(organizationId)

      let selectedUploadId: string | null
      let selectedFecha: Date | null
      if (filters.uploadId) {
        // Anti-IDOR: la carga debe pertenecer a esta organización Y a este
        // servicio — nunca confiar en que el uploadId de la query pertenece
        // a quien lo pide (mismo patrón que getUploadDetail).
        const upload = await repository.findUploadDetail(filters.uploadId, organizationId)
        if (!upload || upload.serviceId !== service.id) {
          throw new VariablesError('UPLOAD_NOT_FOUND', 'Carga no encontrada')
        }
        selectedUploadId = upload.id
        selectedFecha = upload.fechaEvaluacion
      } else {
        const latestUpload = await repository.findLatestUpload(organizationId, service.id)
        selectedUploadId = latestUpload?.id ?? null
        selectedFecha = latestUpload?.fechaEvaluacion ?? null
      }

      if (!selectedUploadId) {
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
          riesgoGlobal: null,
          alertasActivas: 0,
          tendenciaGlobal: null,
          evolucionIgho: null,
          probabilidadIncumplimiento: null,
          riesgoSalud: null,
          puntajeIntervencion: null,
          prioridadIntervencion: null,
          matrizPosicion: null,
          trend: [],
          filtrosDisponibles: { areasPlanta: [], procesosActividad: [] },
        }
      }

      const allReadings = await repository.findReadingsByUpload(selectedUploadId)

      // Opciones reales disponibles para los selectores de filtro — del total
      // de la carga, antes de aplicar el filtro (para que el desplegable no
      // se vacíe a medida que el usuario filtra).
      const filtrosDisponibles = {
        areasPlanta: [...new Set(allReadings.map((r) => r.workPoint.areaPlanta))].sort(),
        procesosActividad: [...new Set(allReadings.map((r) => r.workPoint.procesoActividad))].sort(),
      }

      const latestReadings = allReadings.filter(
        (r) =>
          (!filters.areaPlanta || r.workPoint.areaPlanta === filters.areaPlanta) &&
          (!filters.procesoActividad || r.workPoint.procesoActividad === filters.procesoActividad),
      )

      // Agrupa las lecturas (ya filtradas) por variable, para la tabla
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

      // "Riesgo global promedio" — metodología propuesta, ver riskLevel.ts.
      // Mismo alcance (latestReadings, ya filtradas) que globalCompliance:
      // las mediciones "sin norma" (calculateRiskRatio devuelve null) se
      // excluyen del promedio en vez de contaminar con un valor inventado.
      //
      // Mismo recorrido reutilizado para el Grupo B de Hoja 3 (ver
      // interventionAnalysis.ts, propuestas pendientes de validación
      // formal): "riesgo en salud" es la misma clasificación acotada a
      // categorías con impacto fisiológico, y "puntaje de intervención"
      // combina el mismo ratio con la variable de exposición reportada de
      // la misma categoría/puesto (cuando existe).
      const exposicionPorPuestoYCategoria = new Map<string, number>()
      for (const reading of latestReadings) {
        const codigoExposicion = CODIGO_TIEMPO_EXPOSICION_POR_CATEGORIA[reading.definition.categoria]
        if (codigoExposicion && reading.definition.codigo === codigoExposicion) {
          exposicionPorPuestoYCategoria.set(`${reading.workPointId}:${reading.definition.categoria}`, reading.valor)
        }
      }

      const riskLevels: RiskLevel[] = []
      const riesgoSaludLevels: RiskLevel[] = []
      const puntajesIntervencion: number[] = []
      for (const reading of latestReadings) {
        const ratio = calculateRiskRatio(reading.valor, reading.definition)
        if (ratio == null) continue

        const nivel = classifyRiskRatio(ratio)
        riskLevels.push(nivel)
        if (CATEGORIAS_RIESGO_SALUD.includes(reading.definition.categoria)) {
          riesgoSaludLevels.push(nivel)
        }

        const horasExposicion = exposicionPorPuestoYCategoria.get(`${reading.workPointId}:${reading.definition.categoria}`) ?? null
        puntajesIntervencion.push(calculatePuntajeIntervencion(ratio, horasExposicion).puntaje)
      }
      const riesgoGlobal = averageRiskLevel(riskLevels)
      const riesgoSalud = averageRiskLevel(riesgoSaludLevels)
      const puntajeIntervencion =
        puntajesIntervencion.length > 0
          ? Math.round(puntajesIntervencion.reduce((a, b) => a + b, 0) / puntajesIntervencion.length)
          : null
      const prioridadIntervencion = puntajeIntervencion == null ? null : classifyIntervencionPrioridad(puntajeIntervencion)
      const matrizPosicion = riesgoGlobal == null ? null : classifyMatrizPosicion(globalPct, riesgoGlobal.nivel)

      const alertasActivas = await nonConformities.countActive(
        organizationId,
        service.id,
        selectedUploadId,
        selectedFecha!,
      )

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

      // Hoja 3 · Análisis — series temporales (Grupo A, ver trendAnalysis.ts).
      // Mismos `allUploads` que arriba: un "periodo" es una carga, no un
      // corte de calendario. `null` cuando no hay suficiente histórico —
      // el frontend distingue esto de "Pendiente" (Grupo B, sin
      // metodología definida todavía) con un mensaje distinto.
      const compliancePeriods: PeriodPoint[] = allUploads.map((upload) => ({
        fecha: upload.fechaEvaluacion.toISOString().slice(0, 10),
        pct: computeUploadCompliancePct(upload.readings),
      }))
      const tendenciaGlobal = computeTendenciaGlobal(compliancePeriods)
      const evolucionIgho = computeEvolucionIgho(compliancePeriods)
      const probabilidadIncumplimiento = computeProbabilidadIncumplimiento(compliancePeriods)

      return {
        service: { slug: service.slug, nombre: service.nombre, updateFrequency: service.updateFrequency },
        lastUpdated: selectedFecha,
        totalWorkPoints,
        categories,
        globalCompliance: { pct: globalPct, ...globalCompliance },
        riesgoGlobal,
        alertasActivas,
        tendenciaGlobal,
        evolucionIgho,
        probabilidadIncumplimiento,
        riesgoSalud,
        puntajeIntervencion,
        prioridadIntervencion,
        matrizPosicion,
        trend,
        filtrosDisponibles,
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
        hasOmittedRows: Array.isArray(upload.omittedRows) && upload.omittedRows.length > 0,
        zonaId: upload.zonaId,
        zonaNombre: upload.zona?.nombre ?? null,
        seccionId: upload.seccionId,
        seccionNombre: upload.seccion?.nombre ?? null,
        cargoId: upload.cargoId,
        cargoNombre: upload.cargo?.nombre ?? null,
        trabajadorId: upload.trabajadorId,
        trabajadorNombre: upload.trabajador?.nombre ?? null,
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
        zonaNombre: upload.zona?.nombre ?? null,
        seccionNombre: upload.seccion?.nombre ?? null,
        cargoNombre: upload.cargo?.nombre ?? null,
        trabajadorNombre: upload.trabajador?.nombre ?? null,
        omittedRows: (upload.omittedRows as { nombre: string; motivo: string }[] | null) ?? [],
        readings: upload.readings.map((r) => ({
          workPointCodigo: r.workPoint.codigo,
          workPointNombre: r.workPoint.nombre,
          areaPlanta: r.workPoint.areaPlanta,
          variableCodigo: r.definition.codigo,
          variableNombre: r.definition.nombre,
          unidadMedida: r.definition.unidadMedida,
          valor: r.valor,
          semaforo: r.semaforo,
          isCorrected: r.isCorrected,
          correctedAt: r.correctedAt,
          correctionReason: r.correctionReason,
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

      // Antes esto solo quedaba en AuditLog (invisible para el cliente) — el
      // cliente ahora se entera de que un admin corrigió manualmente uno de
      // sus resultados, con el motivo, en vez de ver el dato cambiar sin
      // explicación en su próxima visita al dashboard.
      await notifications.notify({
        type: 'LECTURA_CORREGIDA',
        organizationId: input.organizationId,
        message: `Se corrigió manualmente "${reading.definition.nombre}" en "${reading.workPoint.nombre}": ${reading.valor} → ${input.valor} ${reading.definition.unidadMedida}. Motivo: ${input.reason}`,
        link: '/dashboard/historial',
        entityType: 'VARIABLE_READING',
        entityId: input.readingId,
      })

      await nonConformities.syncForReading({
        readingId: input.readingId,
        organizationId: input.organizationId,
        serviceId: reading.definition.serviceId,
        workPointId: reading.workPointId,
        valor: input.valor,
        semaforo,
        unidadMedida: reading.definition.unidadMedida,
        variableNombre: reading.definition.nombre,
        workPointNombre: reading.workPoint.nombre,
        zona: reading.workPoint.areaPlanta,
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
    instrumento: string | null
    incertidumbre: string | null
    simbolo: string | null
  },
  readings: {
    id: string
    valor: number
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
    isCorrected: boolean
    correctionReason: string | null
    workPoint: { codigo: string; nombre: string; areaPlanta: string; procesoActividad: string }
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
    comparisonType: definition.comparisonType,
    tipo: definition.tipo,
    instrumento: definition.instrumento,
    incertidumbre: definition.incertidumbre,
    simbolo: definition.simbolo,
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
        procesoActividad: r.workPoint.procesoActividad,
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
  comparisonType: SemaphoreThresholds['comparisonType']
  tipo: VariableMeasurementType | null
  instrumento: string | null
  incertidumbre: string | null
  simbolo: string | null
}) {
  return {
    definitionId: definition.id,
    codigo: definition.codigo,
    nombre: definition.nombre,
    unidadMedida: definition.unidadMedida,
    limiteMin: definition.limiteMin,
    limiteMax: definition.limiteMax,
    normativaRef: definition.normativaRef,
    comparisonType: definition.comparisonType,
    tipo: definition.tipo,
    instrumento: definition.instrumento,
    incertidumbre: definition.incertidumbre,
    simbolo: definition.simbolo,
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
