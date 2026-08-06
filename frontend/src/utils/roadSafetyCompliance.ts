import type { CategoryCardStatus } from '@/types/dashboard'
import type { RoadSafetyPesvPaso } from '@/types/roadSafety'

/** Convención adoptada para esta feature (2026-08) — NO es un corte de la
 * Resolución 40595/2022, que no define esta escala. Confirmado con el
 * usuario en vez de inventado: ≥80% VERDE, 60-79% AMARILLO, <60% ROJO. */
export function classifyPesvCompliance(pct: number | null): CategoryCardStatus {
  if (pct == null) return 'SIN_DATOS'
  if (pct >= 80) return 'VERDE'
  if (pct >= 60) return 'AMARILLO'
  return 'ROJO'
}

/** Re-agrega los pasos PESV por su propio campo `cumplimiento` (ya
 * clasificado — 'Cumple'/'Parcial'/'No cumple' — no requiere ningún umbral
 * nuevo) para alimentar ComplianceRing — mismo shape que `GlobalCompliance`
 * (pct/verde/amarillo/rojo/total). Los pasos sin dato (`cumplimiento: null`)
 * se excluyen del conteo, igual que el resto del sistema trata "sin datos
 * todavía" como distinto de "en 0". */
export function buildPesvGlobalCompliance(pasos: RoadSafetyPesvPaso[]) {
  const verde = pasos.filter((p) => p.cumplimiento === 'Cumple').length
  const amarillo = pasos.filter((p) => p.cumplimiento === 'Parcial').length
  const rojo = pasos.filter((p) => p.cumplimiento === 'No cumple').length
  const total = verde + amarillo + rojo
  const pct = total > 0 ? Math.round((verde / total) * 100) : 0
  return { pct, verde, amarillo, rojo, total }
}
