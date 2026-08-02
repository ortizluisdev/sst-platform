import type { PrismaClient } from '@prisma/client'
import { createRoadSafetyRepository } from './roadSafety.repository.js'
import { parseRoadSafetyWorkbook, RoadSafetyParseError } from '../../utils/roadSafetyWorkbookParser.js'
import {
  diasHasta,
  anomaliaConsumoPct,
  calcularAlertaVehiculo,
  calcularIcc,
  calcularResultadoConductor,
  calcularAlertaConductor,
  calcularCumplimientoPesv,
} from '../../utils/roadSafetyCalculations.js'
import {
  INVENTARIO_GRUPOS,
  INVENTARIO_CONCEPTOS_POR_GRUPO,
  PESV_PASOS,
  CONDICIONES_RIESGO,
  ORGANISMOS_APOYO_NACIONALES,
  type InventarioGrupo,
} from '../../utils/roadSafetyConstants.js'

export class RoadSafetyError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND' | 'ORG_NOT_FOUND' | 'PARSE_ERROR',
    message: string,
  ) {
    super(message)
  }
}

export function createRoadSafetyService(prisma: PrismaClient) {
  const repository = createRoadSafetyRepository(prisma)

  return {
    async uploadWorkbook(organizationId: string, uploadedById: string, file: { buffer: Buffer; filename: string }) {
      const organization = await repository.findOrganizationById(organizationId)
      if (!organization) throw new RoadSafetyError('ORG_NOT_FOUND', 'Organización no encontrada')

      const service = await repository.findServiceBySlug('seguridad-vial')
      if (!service) throw new RoadSafetyError('SERVICE_NOT_FOUND', 'Servicio Seguridad Vial no encontrado')

      let parsed
      try {
        parsed = await parseRoadSafetyWorkbook(file.buffer)
      } catch (err) {
        const message = err instanceof RoadSafetyParseError ? err.message : 'No se pudo leer el archivo.'
        throw new RoadSafetyError('PARSE_ERROR', message)
      }

      return repository.createUploadTransaction({
        organizationId,
        serviceId: service.id,
        uploadedById,
        originalFile: file.filename,
        parsed,
      })
    },

    async getUploadHistory(organizationId: string) {
      const service = await repository.findServiceBySlug('seguridad-vial')
      if (!service) throw new RoadSafetyError('SERVICE_NOT_FOUND', 'Servicio Seguridad Vial no encontrado')
      const uploads = await repository.findUploadHistory(organizationId, service.id)
      return uploads.map((u) => ({
        id: u.id,
        originalFile: u.originalFile,
        counts: u.counts,
        uploadedByNombre: u.uploadedBy.nombre,
        createdAt: u.createdAt,
      }))
    },

    /** Hoja 1 · Generalidad — 24 pasos PESV (con % cumplimiento global
     * calculado) + los 3 bloques de inventario (con sus totales sumados al
     * leer, nunca guardados). */
    async getDashboardHoja1(organizationId: string) {
      const [pasosGuardados, itemsGuardados] = await Promise.all([
        repository.findPesvPasos(organizationId),
        repository.findInventario(organizationId),
      ])

      const pasosPorNumero = new Map(pasosGuardados.map((p) => [p.paso, p]))
      const pasos = PESV_PASOS.map((template) => {
        const guardado = pasosPorNumero.get(template.paso)
        return {
          fase: template.fase,
          paso: template.paso,
          elemento: guardado?.elemento ?? template.elemento,
          nivelAplicable: guardado?.nivelAplicable ?? template.nivelAplicable,
          cumplimiento: guardado?.cumplimiento ?? null,
          porcentajeAvance: guardado?.porcentajeAvance ?? null,
          evidencia: guardado?.evidencia ?? null,
          observaciones: guardado?.observaciones ?? null,
        }
      })
      const cumplimientoPesvGlobal = calcularCumplimientoPesv(pasos.map((p) => p.porcentajeAvance))

      const itemsPorGrupoConcepto = new Map(itemsGuardados.map((i) => [`${i.grupo}:${i.concepto}`, i]))
      const inventario = Object.fromEntries(
        INVENTARIO_GRUPOS.map((grupo: InventarioGrupo) => {
          const items = INVENTARIO_CONCEPTOS_POR_GRUPO[grupo].map((concepto) => {
            const guardado = itemsPorGrupoConcepto.get(`${grupo}:${concepto}`)
            return { concepto, cantidad: guardado?.cantidad ?? 0, observaciones: guardado?.observaciones ?? null }
          })
          const total = items.reduce((sum, i) => sum + i.cantidad, 0)
          return [grupo, { items, total }]
        }),
      ) as Record<InventarioGrupo, { items: { concepto: string; cantidad: number; observaciones: string | null }[]; total: number }>

      return { pasos, cumplimientoPesvGlobal, inventario }
    },

    /** Hoja 2 · Vehículos — con Días SOAT/RTM, Anomalía de consumo y
     * Alerta calculados al leer (nunca guardados, dependen de "hoy"). */
    async getDashboardHoja2(organizationId: string) {
      const vehiculos = await repository.findVehiculos(organizationId)
      return vehiculos.map((v) => {
        const diasSoat = diasHasta(v.soatVence)
        const diasRtm = diasHasta(v.rtmVence)
        const anomalia = anomaliaConsumoPct(v.rendimientoKmGal, v.rendimientoBaseKmGal)
        const alerta = calcularAlertaVehiculo({
          diasSoat,
          diasRtm,
          comparendos: v.comparendos,
          kmActual: v.kmActual,
          kmProxMant: v.kmProxMant,
          anomaliaConsumoPct: anomalia,
          llantasLabradoMm: v.llantasLabradoMm,
          pruebaFrenado: v.pruebaFrenado,
        })
        return { ...v, diasSoat, diasRtm, anomaliaConsumoPct: anomalia, alerta }
      })
    },

    /** Hoja 3 · Personas — con ICC, Resultado, Días licencia y Alerta
     * calculados al leer. */
    async getDashboardHoja3(organizationId: string) {
      const conductores = await repository.findConductores(organizationId)
      return conductores.map((c) => {
        const icc = calcularIcc([
          c.scoreConduccionSegura,
          c.scoreManejoDefensivo,
          c.scoreManejoComentadoDiurno,
          c.scoreManejoComentadoNocturno,
          c.scoreConocimientoVehiculo,
          c.scoreNormasTransito,
          c.scoreGestionFatiga,
          c.scoreInvestigacionSiniestros,
          c.scorePrimerosAuxilios,
        ])
        const diasLicencia = diasHasta(c.licenciaVence)
        const resultado = calcularResultadoConductor(icc)
        const alerta = calcularAlertaConductor({ diasLicencia, icc, estadoSalud: c.estadoSalud })
        return { ...c, icc, resultado, diasLicencia, alerta }
      })
    },

    /** Hoja 4 · Rutograma — la ficha completa (organismos nacionales fijos
     * + locales guardados, condiciones de riesgo con etiqueta, puntos). */
    async getDashboardHoja4(organizationId: string) {
      const rutas = await repository.findRutas(organizationId)
      return rutas.map((r) => ({
        ...r,
        organismosApoyoNacionales: ORGANISMOS_APOYO_NACIONALES,
        organismosApoyoLocal: (r.organismosApoyoLocal ?? []) as unknown[],
        condicionesRiesgo: CONDICIONES_RIESGO.map((c) => ({
          ...c,
          marcado: Boolean((r.condicionesRiesgo as Record<string, boolean> | null)?.[c.clave]),
        })),
        puntos: r.puntos,
      }))
    },

    /** Panel de alertas consolidado — reutiliza los mismos cálculos que
     * Hoja 2/Hoja 3, no duplica la lógica de negocio. */
    async getAlertasPanel(organizationId: string) {
      const [vehiculos, conductores] = await Promise.all([
        this.getDashboardHoja2(organizationId),
        this.getDashboardHoja3(organizationId),
      ])

      return {
        vehiculos: {
          vencidos: vehiculos.filter((v) => v.alerta === 'VENCIDO').length,
          enAlerta: vehiculos.filter((v) => v.alerta === 'ALERTA').length,
          soatRtmPorVencer: vehiculos.filter(
            (v) => (v.diasSoat != null && v.diasSoat > 0 && v.diasSoat <= 30) || (v.diasRtm != null && v.diasRtm > 0 && v.diasRtm <= 30),
          ).length,
          conComparendos: vehiculos.filter((v) => v.comparendos > 0).length,
        },
        conductores: {
          licenciasVencidas: conductores.filter((c) => c.alerta === 'LICENCIA_VENCIDA').length,
          licenciasPorVencer: conductores.filter((c) => c.diasLicencia != null && c.diasLicencia > 0 && c.diasLicencia <= 30).length,
          noAprobados: conductores.filter((c) => c.resultado === 'No aprobado').length,
          enAlerta: conductores.filter((c) => c.alerta === 'ALERTA' || c.alerta === 'LICENCIA_VENCIDA').length,
        },
      }
    },
  }
}

export type RoadSafetyService = ReturnType<typeof createRoadSafetyService>
