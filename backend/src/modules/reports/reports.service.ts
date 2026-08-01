import type { PrismaClient } from '@prisma/client'
import { createReportsRepository } from './reports.repository.js'
import { createVariablesService } from '../variables/variables.service.js'
import { createNonConformitiesService } from '../nonConformities/nonConformities.service.js'
import { HEADLINE_CODE_POR_CATEGORIA } from '../../utils/headlineVariables.js'
import { resolveSentido, calculateHoja1Estado } from '../../utils/reportFormatting.js'
import type { ReportMetadata } from './reports.schema.js'
import { renderReporteHoja1Pdf } from './reports.pdfHoja1.js'
import { renderReporteHoja2Pdf } from './reports.pdfHoja2.js'
import { buildReporteHoja2Csv } from './reports.csv.js'

export class ReportsError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND' | 'ORG_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

const RIESGO_LABEL: Record<'BAJO' | 'MEDIO' | 'ALTO', string> = { BAJO: 'Bajo', MEDIO: 'Medio', ALTO: 'Alto' }

// Cuántas filas mostrar en "Hallazgos / no conformidades principales" y
// "Recomendaciones principales" de Reporte Hoja 1 — es un RESUMEN ejecutivo
// de una página (ver plantilla), la lista completa vive en el dashboard.
const RESUMEN_MAX_FILAS = 10

export function createReportsService(prisma: PrismaClient) {
  const repository = createReportsRepository(prisma)
  const variablesService = createVariablesService(prisma)
  const nonConformitiesService = createNonConformitiesService(prisma)

  async function buildCommonData(organizationId: string, serviceSlug: string, uploadId: string | undefined) {
    const organization = await repository.findOrganizationById(organizationId)
    if (!organization) throw new ReportsError('ORG_NOT_FOUND', 'Organización no encontrada')

    const dashboard = await variablesService.getDashboard(organizationId, serviceSlug, { uploadId })
    const nonConformities = await nonConformitiesService.list(organizationId, serviceSlug)

    return { organization, dashboard, nonConformities }
  }

  async function resolveMetadataDefaults(
    organizationId: string,
    firmanteUserId: string,
    metadata: ReportMetadata,
  ) {
    const responsable = await repository.findResponsable(organizationId)
    // "Elaborado por" siempre lo firma el Super-Admin (RoMa), sin importar
    // quién genera el reporte; el cliente que lo genera firma aparte, en
    // "Firma cliente" — ver spec de doble firma aprobada.
    const superAdmin = await repository.findSuperAdminFirmante()
    const cliente = await repository.findFirmante(firmanteUserId)

    return {
      direccion: metadata.direccion ?? '—',
      ciudad: metadata.ciudad ?? '—',
      sede: metadata.sede ?? '—',
      area: metadata.area ?? '—',
      periodoEvaluacion: metadata.periodoEvaluacion ?? '—',
      numeroInforme: metadata.numeroInforme ?? '—',
      contacto: responsable?.user.nombre ?? '—',
      cargo: responsable?.user.cargo ?? '—',
      elaboradoPor: metadata.elaboradoPor || superAdmin?.nombre || '—',
      firmaBase64: superAdmin?.firmaBase64 ?? null,
      clienteNombre: cliente?.nombre ?? '—',
      clienteCargo: cliente?.cargo ?? null,
      clienteFirmaBase64: cliente?.firmaBase64 ?? null,
    }
  }

  return {
    async generatePdf(
      organizationId: string,
      serviceSlug: string,
      firmanteUserId: string,
      input: { tipo: 'basico' | 'tecnico'; uploadId?: string; metadata: ReportMetadata },
    ): Promise<Buffer> {
      const { organization, dashboard, nonConformities } = await buildCommonData(organizationId, serviceSlug, input.uploadId)
      const meta = await resolveMetadataDefaults(organizationId, firmanteUserId, input.metadata)

      const fechaEmision = new Date().toLocaleDateString('es-CO')
      const fechaEvaluacion = dashboard.lastUpdated
        ? new Date(dashboard.lastUpdated).toLocaleDateString('es-CO')
        : fechaEmision

      const activasOrdenadas = nonConformities
        .filter((nc) => nc.estado !== 'CERRADA')
        .sort((a, b) => PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad])
        .slice(0, RESUMEN_MAX_FILAS)

      if (input.tipo === 'basico') {
        // "Resultados por agente vs. norma" — una fila por categoría, usando
        // la MISMA variable de cabecera que ya se usa en Hoja 1 · Dashboard
        // (nunca un promedio entre variables de distinta unidad).
        const filasAgente = Object.entries(HEADLINE_CODE_POR_CATEGORIA)
          .map(([categoria, codigo]) => {
            const categoriaData = dashboard.categories.find((c) => c.categoria === categoria)
            const variable = categoriaData?.variables.find((v) => v.codigo === codigo)
            if (!variable) return null
            const sentido = resolveSentido(variable.comparisonType, variable.limiteMin, variable.limiteMax)
            const limite = sentido === 'max' ? variable.limiteMax : sentido === 'min' ? variable.limiteMin : null
            return {
              agente: categoria,
              variableClave: `${variable.nombre} (${variable.unidadMedida})`,
              resultado: variable.promedio,
              limite,
              sentido,
              estado: sentido != null && limite != null ? calculateHoja1Estado(variable.promedio, limite, sentido) : 'Informativo',
            }
          })
          .filter((f): f is NonNullable<typeof f> => f != null)

        return renderReporteHoja1Pdf({
          empresa: organization.nombre,
          nit: organization.nit ?? '—',
          ...meta,
          fechaEvaluacion,
          fechaEmision,
          igho: dashboard.globalCompliance.pct,
          cumplimientoPct: dashboard.globalCompliance.pct,
          nivelRiesgo: dashboard.riesgoGlobal ? RIESGO_LABEL[dashboard.riesgoGlobal.nivel] : '—',
          noConformidades: dashboard.alertasActivas,
          totalMediciones: dashboard.globalCompliance.total,
          puestosEvaluados: dashboard.totalWorkPoints,
          filasAgente,
          hallazgos: activasOrdenadas.map((nc) => ({
            prioridad: nc.prioridad,
            descripcion: nc.descripcion,
            variable: nc.variableNombre,
            estado: nc.estado,
          })),
          recomendaciones: activasOrdenadas.map((nc) => ({ prioridad: nc.prioridad, recomendacion: nc.descripcion })),
        })
      }

      return renderReporteHoja2Pdf({
        empresa: organization.nombre,
        sede: meta.sede,
        periodoEvaluacion: meta.periodoEvaluacion,
        numeroInforme: meta.numeroInforme,
        elaboradoPor: meta.elaboradoPor,
        fechaEmision,
        categories: dashboard.categories,
      })
    },

    async generateCsv(organizationId: string, serviceSlug: string, uploadId: string | undefined): Promise<string> {
      const { dashboard } = await buildCommonData(organizationId, serviceSlug, uploadId)
      return buildReporteHoja2Csv(dashboard.categories)
    },
  }
}

const PRIORIDAD_ORDEN: Record<'ALTA' | 'MEDIA' | 'BAJA', number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }

export type ReportsService = ReturnType<typeof createReportsService>
