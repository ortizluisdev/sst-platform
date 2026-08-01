import type { VariableComparisonType } from '@prisma/client'

/** Estado por variable en los reportes (Reporte Hoja 2) — mismo criterio
 * que resolveDisplayStatus.ts (frontend): SIN_DATOS es un guión (nada que
 * evaluar), sin ningún límite definido es "Informativo" (medido, no hay
 * norma con qué comparar), y solo entonces VERDE/no-VERDE se traduce a
 * Cumple/No cumple. Nunca se reutiliza AMARILLO tal cual — el backend lo
 * usa como "sin límite" Y como "fuera de margen", indistinguibles sin este
 * chequeo (ver semaphore.ts). */
export function resolveReportEstado(v: {
  estado: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS'
  limiteMin: number | null
  limiteMax: number | null
}): 'Cumple' | 'No cumple' | 'Informativo' | '—' {
  if (v.estado === 'SIN_DATOS') return '—'
  if (v.limiteMin == null && v.limiteMax == null) return 'Informativo'
  return v.estado === 'VERDE' ? 'Cumple' : 'No cumple'
}

/** "Referencia/norma" de Reporte Hoja 2 — string de solo lectura formateada
 * desde limiteMin/limiteMax, nunca al revés (nunca se parsea texto libre
 * para calcular Cumple/No cumple — ver disclaimer en reports.service.ts).
 * Usa ">="/"<=" en vez de "≥"/"≤": la fuente Helvetica base de pdfkit
 * (WinAnsiEncoding) no tiene esos glifos Unicode y los renderiza como
 * basura — verificado generando el PDF real antes de dar esto por
 * terminado, no solo revisando el código. */
export function formatReferenciaNorma(min: number | null, max: number | null, unidadMedida: string): string {
  const unidad = unidadMedida && unidadMedida !== '—' ? ` ${unidadMedida}` : ''
  if (min != null && max != null) return `${min} – ${max}${unidad}`
  if (max != null) return `<= ${max}${unidad}`
  if (min != null) return `>= ${min}${unidad}`
  return '—'
}

export type ReportSentido = 'min' | 'max'

/** "Sentido" de Reporte Hoja 1 (tabla de 5 agentes) — MAX_LIMIT/MIN_LIMIT
 * mapean directo; RANGE (los 2 límites a la vez, caso raro entre las
 * variables de cabecera) prioriza "max" si ambos están definidos, ya que
 * es el sentido más común en las normas de higiene ocupacional del
 * catálogo actual. */
export function resolveSentido(comparisonType: VariableComparisonType, limiteMin: number | null, limiteMax: number | null): ReportSentido | null {
  if (comparisonType === 'MIN_LIMIT') return limiteMin == null ? null : 'min'
  if (comparisonType === 'MAX_LIMIT') return limiteMax == null ? null : 'max'
  // RANGE
  if (limiteMax != null) return 'max'
  if (limiteMin != null) return 'min'
  return null
}

/**
 * Estado de la tabla "Resultados por agente vs. norma" de Reporte Hoja 1 —
 * misma fórmula IF que la plantilla Excel de referencia:
 * `=IF(sentido="max", IF(resultado<=limite,"Cumple","No cumple"),
 *      IF(resultado>=limite,"Cumple","No cumple"))`.
 * Replicada literalmente, no reinventada — ver backend/templates/variablesdash1.xlsx,
 * hoja "Reporte Hoja 1", columna G.
 */
export function calculateHoja1Estado(resultado: number, limite: number, sentido: ReportSentido): 'Cumple' | 'No cumple' {
  if (sentido === 'max') return resultado <= limite ? 'Cumple' : 'No cumple'
  return resultado >= limite ? 'Cumple' : 'No cumple'
}

/** "Impacto" de la tabla "Recomendaciones principales" — no existe un campo
 * propio en el modelo (ver investigación previa a implementar), se deriva
 * de la prioridad de la no conformidad de origen. */
export function impactoFromPrioridad(prioridad: 'ALTA' | 'MEDIA' | 'BAJA'): 'Alto' | 'Medio' | 'Bajo' {
  if (prioridad === 'ALTA') return 'Alto'
  if (prioridad === 'MEDIA') return 'Medio'
  return 'Bajo'
}
