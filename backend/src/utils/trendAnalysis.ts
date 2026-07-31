/**
 * Serie temporal para Hoja 3 · Análisis. "Periodo" = una carga (VariableUpload)
 * de la organización/servicio, no un corte de calendario — no existe un
 * filtro de rango de fechas real en el dashboard hoy, solo selección de una
 * carga puntual (ver getDashboard en variables.service.ts). "Periodo
 * anterior" = la carga cronológicamente inmediata anterior. "Últimos 6
 * meses" = las últimas 6 cargas disponibles, no 6 cortes mensuales.
 */
export interface PeriodPoint {
  fecha: string
  pct: number
}

export interface TendenciaGlobal {
  deltaPct: number
  actualPct: number
  anteriorPct: number
}

export interface ProbabilidadIncumplimiento {
  probabilidadPct: number
  fechaProyeccion: string
}

/** % de lecturas VERDE de una carga — mismo cálculo que globalCompliance.pct
 * en getDashboard, pero por carga histórica individual en vez de por la
 * carga actualmente seleccionada. */
export function computeUploadCompliancePct(readings: { semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' }[]): number {
  if (readings.length === 0) return 0
  const verde = readings.filter((r) => r.semaforo === 'VERDE').length
  return Math.round((verde / readings.length) * 100)
}

/** Mínimo 2 períodos: "tendencia" necesita un "actual" y un "anterior" con
 * qué compararlo. `null` si no hay suficiente histórico — el llamador debe
 * mostrar "Datos insuficientes", no un número inventado. */
export function computeTendenciaGlobal(periods: PeriodPoint[]): TendenciaGlobal | null {
  if (periods.length < 2) return null
  const actual = periods[periods.length - 1]!
  const anterior = periods[periods.length - 2]!
  // Guard contra división por cero: si el período anterior tenía 0% de
  // cumplimiento, el cambio relativo no está definido (cualquier mejora es
  // "infinita" en términos porcentuales) — se reporta el delta en puntos
  // porcentuales directamente en ese caso, no un porcentaje de cambio.
  const deltaPct = anterior.pct === 0 ? actual.pct - anterior.pct : ((actual.pct - anterior.pct) / anterior.pct) * 100
  return { deltaPct: round2(deltaPct), actualPct: actual.pct, anteriorPct: anterior.pct }
}

/** Mínimo 2 períodos: una serie de 1 solo punto no es una "evolución".
 * Devuelve hasta los últimos `max` períodos (por defecto 6, ver definición
 * de "últimos 6 meses" arriba) — nunca más aunque haya más historial. */
export function computeEvolucionIgho(periods: PeriodPoint[], max = 6): PeriodPoint[] | null {
  if (periods.length < 2) return null
  return periods.slice(-max)
}

/**
 * Proyección simple de "probabilidad de incumplimiento a 30 días": regresión
 * lineal (mínimos cuadrados ordinarios) del % de cumplimiento histórico
 * contra el tiempo (días desde el primer período), extrapolada 30 días
 * después del último período disponible. La "probabilidad de incumplimiento"
 * es 100 - cumplimiento_proyectado, acotado a [0,100].
 *
 * Método deliberadamente simple (no es un modelo predictivo real ni
 * considera estacionalidad/autocorrelación) — es una extrapolación lineal
 * de la tendencia reciente, documentada como tal. Metodología propuesta,
 * pendiente de validación formal con el cliente — ver
 * docs/superpowers/specs/2026-07-29-variable-catalog-restructure-design.md
 * (sub-proyecto B) y calculateRiskRatio en riskLevel.ts (mismo criterio de
 * "no es un estándar fijo, es una propuesta de negocio documentada").
 *
 * Mínimo 3 períodos: con 2 puntos la recta de regresión pasa exactamente
 * por ambos (ajuste perfecto trivial, sin ningún residual) — no aporta
 * información sobre la fiabilidad de la tendencia. Un tercer punto es el
 * mínimo para que la regresión tenga al menos un grado de libertad.
 */
export function computeProbabilidadIncumplimiento(periods: PeriodPoint[], minPeriods = 3): ProbabilidadIncumplimiento | null {
  if (periods.length < minPeriods) return null

  const primeraFecha = new Date(periods[0]!.fecha).getTime()
  const puntos = periods.map((p) => ({
    x: (new Date(p.fecha).getTime() - primeraFecha) / (1000 * 60 * 60 * 24), // días desde el primer período
    y: p.pct,
  }))

  const n = puntos.length
  const sumX = puntos.reduce((acc, p) => acc + p.x, 0)
  const sumY = puntos.reduce((acc, p) => acc + p.y, 0)
  const sumXY = puntos.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumX2 = puntos.reduce((acc, p) => acc + p.x * p.x, 0)

  const denominador = n * sumX2 - sumX * sumX
  // Todos los períodos con la misma fecha (no debería pasar en la práctica,
  // fechaEvaluacion es parte de una unique constraint) — sin pendiente
  // calculable, se usa el promedio como proyección plana.
  const pendiente = denominador === 0 ? 0 : (n * sumXY - sumX * sumY) / denominador
  const intercepto = (sumY - pendiente * sumX) / n

  const ultimoDia = puntos[puntos.length - 1]!.x
  const diaProyectado = ultimoDia + 30
  const cumplimientoProyectado = pendiente * diaProyectado + intercepto
  const probabilidadPct = Math.min(100, Math.max(0, 100 - cumplimientoProyectado))

  const fechaUltima = new Date(periods[periods.length - 1]!.fecha)
  const fechaProyeccion = new Date(fechaUltima.getTime() + 30 * 24 * 60 * 60 * 1000)

  return { probabilidadPct: round2(probabilidadPct), fechaProyeccion: fechaProyeccion.toISOString().slice(0, 10) }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
