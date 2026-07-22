import type { SemaphoreStatus, VariableComparisonType } from '@prisma/client'

export interface SemaphoreThresholds {
  comparisonType: VariableComparisonType
  limiteMin: number | null
  limiteMax: number | null
  /** Fracción (ej. 0.1 = 10%) más allá del límite que todavía se marca
   * AMARILLO en vez de ROJO. Ver VariableDefinition.toleranciaAlerta. */
  toleranciaAlerta: number
}

/**
 * Semáforo de 3 estados (no un corte binario cumple/no-cumple), según cómo
 * se compara la variable contra su norma:
 * - RANGE: debe estar entre limiteMin y limiteMax (ej. iluminancia).
 * - MAX_LIMIT: no debe superar limiteMax (ej. ruido, WBGT).
 * - MIN_LIMIT: no debe bajar de limiteMin.
 * Fuera del rango pero dentro del margen de tolerancia → AMARILLO.
 * Más allá del margen → ROJO.
 */
export function calculateSemaphore(valor: number, def: SemaphoreThresholds): SemaphoreStatus {
  const { comparisonType, limiteMin, limiteMax, toleranciaAlerta } = def

  if (comparisonType === 'RANGE') {
    if (limiteMin == null || limiteMax == null) return 'AMARILLO'
    if (valor >= limiteMin && valor <= limiteMax) return 'VERDE'
    const margen = (limiteMax - limiteMin) * toleranciaAlerta
    if (valor >= limiteMin - margen && valor <= limiteMax + margen) return 'AMARILLO'
    return 'ROJO'
  }

  if (comparisonType === 'MAX_LIMIT') {
    if (limiteMax == null) return 'AMARILLO'
    if (valor <= limiteMax) return 'VERDE'
    if (valor <= limiteMax * (1 + toleranciaAlerta)) return 'AMARILLO'
    return 'ROJO'
  }

  // MIN_LIMIT
  if (limiteMin == null) return 'AMARILLO'
  if (valor >= limiteMin) return 'VERDE'
  if (valor >= limiteMin * (1 - toleranciaAlerta)) return 'AMARILLO'
  return 'ROJO'
}
