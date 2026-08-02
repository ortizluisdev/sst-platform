import type { PrismaClient } from '@prisma/client'
import { createRoadSafetyService } from './roadSafety.service.js'
import { createReportsRepository } from '../reports/reports.repository.js'
import { renderReporteH1Pdf, renderReporteH2Pdf, renderReporteH3Pdf, renderReporteH4Pdf, type RoadSafetySignerData } from './roadSafetyPdf.js'
import { buildHoja1Csv, buildHoja2Csv, buildHoja3Csv, buildHoja4Csv } from './roadSafetyCsv.js'
import type { ReportMetadata, RoadSafetyReportTipo } from './roadSafetyReports.schema.js'

export class RoadSafetyReportsError extends Error {
  constructor(
    public code: 'ORG_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

/** Reutiliza la misma resolución de firmantes que Higiene Industrial
 * (Super-Admin elabora, cliente que genera firma aparte) — ver
 * reports.repository.ts, no se duplica la lógica. */
export function createRoadSafetyReportsService(prisma: PrismaClient) {
  const roadSafety = createRoadSafetyService(prisma)
  const reportsRepository = createReportsRepository(prisma)

  async function resolveSigners(firmanteUserId: string): Promise<RoadSafetySignerData> {
    const [superAdmin, cliente] = await Promise.all([
      reportsRepository.findSuperAdminFirmante(),
      reportsRepository.findFirmante(firmanteUserId),
    ])
    return {
      elaboradoPor: superAdmin?.nombre ?? '—',
      firmaBase64: superAdmin?.firmaBase64 ?? null,
      clienteNombre: cliente?.nombre ?? '—',
      clienteCargo: cliente?.cargo ?? null,
      clienteFirmaBase64: cliente?.firmaBase64 ?? null,
      clienteFotoBase64: cliente?.fotoBase64 ?? null,
      fechaEmision: new Date().toLocaleDateString('es-CO'),
    }
  }

  return {
    async generatePdf(
      organizationId: string,
      firmanteUserId: string,
      input: { tipo: RoadSafetyReportTipo; metadata: ReportMetadata },
    ): Promise<Buffer> {
      const organization = await reportsRepository.findOrganizationById(organizationId)
      if (!organization) throw new RoadSafetyReportsError('ORG_NOT_FOUND', 'Organización no encontrada')

      const signers = await resolveSigners(firmanteUserId)
      const fechaCorte = input.metadata.fechaCorte || new Date().toLocaleDateString('es-CO')

      if (input.tipo === 'h1') {
        const { pasos, cumplimientoPesvGlobal, inventario } = await roadSafety.getDashboardHoja1(organizationId)
        const cobertura = inventario.COBERTURA_OPERACIONAL.items
        return renderReporteH1Pdf({
          ...signers,
          empresa: organization.nombre,
          nit: organization.nit ?? '—',
          sedePrincipal: input.metadata.sedePrincipal || '—',
          ciudad: input.metadata.ciudad || '—',
          responsablePesv: input.metadata.responsablePesv || '—',
          fechaCorte,
          nivelPesv: input.metadata.nivelPesv || '—',
          numeroInforme: input.metadata.numeroInforme || '—',
          cumplimientoGlobal: cumplimientoPesvGlobal,
          pasosCumplen: pasos.filter((p) => p.cumplimiento === 'Cumple').length,
          pasosParciales: pasos.filter((p) => p.cumplimiento === 'Parcial').length,
          pasosSinCumplir: pasos.filter((p) => p.cumplimiento === 'No cumple').length,
          totalActoresViales: inventario.ACTORES_VIALES.total,
          totalVehiculos: inventario.PARQUE_AUTOMOTOR.total,
          ciudadesConOperacion: cobertura.find((i) => i.concepto === 'Ciudades con operación')?.cantidad ?? 0,
          rutasActivas: cobertura.find((i) => i.concepto === 'Rutas activas')?.cantidad ?? 0,
        })
      }

      if (input.tipo === 'h2') {
        const vehiculos = await roadSafety.getDashboardHoja2(organizationId)
        return renderReporteH2Pdf({
          ...signers,
          empresa: organization.nombre,
          fechaCorte,
          totalVehiculos: vehiculos.length,
          conAlerta: vehiculos.filter((v) => v.alerta === 'ALERTA').length,
          soatPorVencer: vehiculos.filter((v) => v.diasSoat != null && v.diasSoat > 0 && v.diasSoat <= 30).length,
          rtmPorVencer: vehiculos.filter((v) => v.diasRtm != null && v.diasRtm > 0 && v.diasRtm <= 30).length,
          documentosVencidos: vehiculos.filter((v) => v.alerta === 'VENCIDO').length,
          conComparendos: vehiculos.filter((v) => v.comparendos > 0).length,
        })
      }

      if (input.tipo === 'h3') {
        const conductores = await roadSafety.getDashboardHoja3(organizationId)
        const total = conductores.length
        const aprobados = conductores.filter((c) => c.resultado === 'Aprobado').length
        const iccValidos = conductores.map((c) => c.icc).filter((i): i is number => i != null)
        return renderReporteH3Pdf({
          ...signers,
          empresa: organization.nombre,
          fechaCorte,
          totalConductores: total,
          pctAprobados: total > 0 ? Math.round((aprobados / total) * 100) : null,
          iccPromedio: iccValidos.length > 0 ? Math.round(iccValidos.reduce((s, i) => s + i, 0) / iccValidos.length) : null,
          noAprobados: conductores.filter((c) => c.resultado === 'No aprobado').length,
          licenciasPorVencer: conductores.filter((c) => c.diasLicencia != null && c.diasLicencia > 0 && c.diasLicencia <= 30).length,
          licenciasVencidas: conductores.filter((c) => c.alerta === 'LICENCIA_VENCIDA').length,
        })
      }

      const rutas = await roadSafety.getDashboardHoja4(organizationId)
      const ruta = rutas[0]
      return renderReporteH4Pdf({
        ...signers,
        empresa: organization.nombre,
        fechaCorte,
        ruta: ruta?.idRuta ?? '—',
        distancia: ruta?.kmsRecorridos ?? '—',
        condicionesMarcadas: ruta?.condicionesRiesgo.filter((c) => c.marcado).length ?? 0,
        puntosAnalizados: ruta?.puntos.length ?? 0,
      })
    },

    async generateCsv(organizationId: string, tipo: RoadSafetyReportTipo): Promise<string> {
      if (tipo === 'h1') {
        const { pasos } = await roadSafety.getDashboardHoja1(organizationId)
        return buildHoja1Csv(pasos)
      }
      if (tipo === 'h2') {
        const vehiculos = await roadSafety.getDashboardHoja2(organizationId)
        return buildHoja2Csv(vehiculos)
      }
      if (tipo === 'h3') {
        const conductores = await roadSafety.getDashboardHoja3(organizationId)
        return buildHoja3Csv(conductores)
      }
      const rutas = await roadSafety.getDashboardHoja4(organizationId)
      return buildHoja4Csv(rutas[0]?.puntos ?? [])
    },
  }
}

export type RoadSafetyReportsService = ReturnType<typeof createRoadSafetyReportsService>
