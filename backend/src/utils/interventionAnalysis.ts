import type { RiskLevel } from './riskLevel.js'

/**
 * Grupo B de Hoja 3 · Análisis — las 4 metodologías de esta clase requieren
 * definición de negocio, no solo más datos. Propuestas construidas sobre lo
 * que ya existe (calculateRiskRatio/classifyRiskRatio de riskLevel.ts),
 * pendientes de validación formal con el cliente final / responsable SST —
 * ver conversación de aprobación. NINGUNA es un estándar fijo.
 */

// --- Riesgo asociado a efectos en salud -------------------------------------

/** Categorías con impacto fisiológico directo documentado en literatura de
 * higiene ocupacional — Iluminación queda fuera a propósito (factor de
 * desempeño visual/tarea, no de daño fisiológico directo en el mismo
 * sentido). Esto NO es un mapeo clínico real variable→efecto en salud (eso
 * requiere tablas de riesgo específicas — curvas de hipoacusia por dB,
 * límites de estrés térmico por WBGT, etc. — que debe validar un
 * profesional SST, no inferirse acá). Reutiliza la MISMA clasificación de
 * "riesgo global" (ver riskLevel.ts), solo acotada a estas categorías. */
export const CATEGORIAS_RIESGO_SALUD: readonly string[] = ['Estrés Térmico', 'Sonido', 'Radiación UV', 'Vibración']

// --- Puntaje de intervención (PI = impacto × exposición) -------------------

/** Variable de "tiempo de exposición REPORTADO" (horas realmente medidas/
 * declaradas) por categoría — deliberadamente NO incluye Radiación UV
 * (RUV-04 es "tiempo MÁXIMO permitido", un límite calculado, no una
 * exposición reportada — usarla invertiría el sentido del factor) ni
 * Estrés Térmico (TER-13/14 son recomendaciones de salida del cálculo
 * WBGT, no un dato de entrada de exposición real) ni Iluminación (no
 * existe esa variable en el catálogo). Para esas categorías se asume
 * jornada completa (factor 1) — supuesto explícito, no silencioso. */
export const CODIGO_TIEMPO_EXPOSICION_POR_CATEGORIA: Partial<Record<string, string>> = {
  Sonido: 'RUI-03',
  Vibración: 'VIB-04',
}

const JORNADA_REFERENCIA_HORAS = 8

export interface PuntajeIntervencion {
  puntaje: number
  impacto: number
  exposicionFactor: number
}

/**
 * PI = impacto × exposición, propuesta de negocio pendiente de validación
 * formal — ver disclaimer arriba, mismo criterio que calculateRiskRatio.
 * Impacto = ratio de severidad menos 1 (0 cuando el valor cumple la norma,
 * crece con cuánto la excede), acotado a 0 hacia abajo. Exposición = horas
 * reportadas normalizadas contra una jornada de 8h; `null` (categoría sin
 * variable de exposición reportada, ver arriba) asume jornada completa.
 * Puntaje final escalado a 0-100.
 */
export function calculatePuntajeIntervencion(ratio: number, horasExposicionReportadas: number | null): PuntajeIntervencion {
  const impacto = Math.max(0, ratio - 1)
  const exposicionFactor =
    horasExposicionReportadas == null ? 1 : Math.min(1, Math.max(0, horasExposicionReportadas / JORNADA_REFERENCIA_HORAS))
  const puntaje = Math.min(100, Math.round(impacto * exposicionFactor * 100))
  return { puntaje, impacto: round2(impacto), exposicionFactor: round2(exposicionFactor) }
}

// --- Nivel de prioridad de intervención --------------------------------------

export type IntervencionPrioridad = 'ALTA' | 'MEDIA' | 'BAJA'

/** Umbrales propuestos, pendientes de validación — PI ≥70 Alta, 40-69
 * Media, <40 Baja. */
export function classifyIntervencionPrioridad(puntaje: number): IntervencionPrioridad {
  if (puntaje >= 70) return 'ALTA'
  if (puntaje >= 40) return 'MEDIA'
  return 'BAJA'
}

// --- Posición en matriz riesgo × cumplimiento --------------------------------

export type MatrizCuadrante = 'CRITICO' | 'VIGILAR' | 'PRIORITARIO' | 'ACEPTABLE'

/** Umbral de "cumplimiento alto" propuesto — 70%, pendiente de validación. */
const CUMPLIMIENTO_ALTO_UMBRAL = 70

/**
 * Eje X = cumplimiento global %, eje Y = nivel de riesgo global (ambos ya
 * existen, sin cálculo nuevo). Cuadrantes propuestos:
 * - ACEPTABLE: cumplimiento alto + riesgo bajo.
 * - VIGILAR: cumplimiento alto + riesgo medio/alto (cumple hoy, pero con
 *   margen estrecho — puede degradar).
 * - PRIORITARIO: cumplimiento bajo + riesgo bajo/medio (corregible, no
 *   urgente).
 * - CRITICO: cumplimiento bajo + riesgo alto.
 */
export function classifyMatrizPosicion(cumplimientoPct: number, riesgoNivel: RiskLevel): MatrizCuadrante {
  const cumplimientoAlto = cumplimientoPct >= CUMPLIMIENTO_ALTO_UMBRAL
  if (cumplimientoAlto) return riesgoNivel === 'BAJO' ? 'ACEPTABLE' : 'VIGILAR'
  return riesgoNivel === 'ALTO' ? 'CRITICO' : 'PRIORITARIO'
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
