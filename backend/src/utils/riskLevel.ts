import type { VariableComparisonType } from '@prisma/client'

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO'

export interface RiskThresholds {
  comparisonType: VariableComparisonType
  limiteMin: number | null
  limiteMax: number | null
}

const RISK_LEVEL_VALUE: Record<RiskLevel, number> = { BAJO: 1, MEDIO: 2, ALTO: 3 }
const RISK_LEVEL_BY_VALUE: Record<number, RiskLevel> = { 1: 'BAJO', 2: 'MEDIO', 3: 'ALTO' }

/**
 * Metodología propuesta para "Riesgo global promedio" (Hoja 1 · Dashboard),
 * pendiente de validación formal con el cliente final — ver sub-proyecto B
 * en docs/superpowers/specs/2026-07-29-variable-catalog-restructure-design.md.
 * No es un estándar ISO fijo, es un ratio de severidad (resultado/límite o
 * límite/resultado) con un umbral fijo (1.15) igual para todas las
 * variables — a propósito DISTINTO del semáforo de 3 estados de
 * semaphore.ts, que usa `toleranciaAlerta` variable por definición. Ambos
 * cálculos coexisten: el semáforo es "cumple/no cumple" puntual por
 * variable; este ratio es la base de un promedio agregado de riesgo.
 *
 * Devuelve `null` cuando no hay límite aplicable (variable "sin norma") —
 * esa medición se excluye del promedio, igual que en resolveDisplayStatus.ts
 * (frontend) para el mismo caso.
 */
export function calculateRiskRatio(valor: number, def: RiskThresholds): number | null {
  const { comparisonType, limiteMin, limiteMax } = def

  if (comparisonType === 'MAX_LIMIT') {
    if (limiteMax == null) return null
    return valor / limiteMax
  }

  if (comparisonType === 'MIN_LIMIT') {
    if (limiteMin == null) return null
    return limiteMin / valor
  }

  // RANGE: sin ningún límite definido → sin norma, se excluye. Dentro del
  // rango (o solo un límite definido y no lo cruza) → ratio 1.0 (Bajo).
  // Fuera → ratio según el límite que realmente violó (un valor no puede
  // ser mayor Y menor que sus límites a la vez).
  if (limiteMin == null && limiteMax == null) return null
  if (limiteMin != null && valor < limiteMin) return limiteMin / valor
  if (limiteMax != null && valor > limiteMax) return valor / limiteMax
  return 1
}

/** ratio ≤ 1.0 → Bajo · 1.0 < ratio ≤ 1.15 → Medio · ratio > 1.15 → Alto. */
export function classifyRiskRatio(ratio: number): RiskLevel {
  if (ratio <= 1.0) return 'BAJO'
  if (ratio <= 1.15) return 'MEDIO'
  return 'ALTO'
}

/** Promedio numérico de clasificaciones (Bajo=1/Medio=2/Alto=3), redondeado
 * a la banda más cercana. `null` si la lista viene vacía (todas las
 * mediciones eran "sin norma" — no hay nada que promediar). */
export function averageRiskLevel(levels: RiskLevel[]): { nivel: RiskLevel; promedio: number } | null {
  if (levels.length === 0) return null
  const suma = levels.reduce((acc, l) => acc + RISK_LEVEL_VALUE[l], 0)
  const promedio = suma / levels.length
  const banda = Math.min(3, Math.max(1, Math.round(promedio)))
  return { nivel: RISK_LEVEL_BY_VALUE[banda], promedio }
}
