import type { CategoryCardStatus, GlobalCompliance } from '@/types/dashboard'
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
export function buildPesvGlobalCompliance(pasos: RoadSafetyPesvPaso[]): GlobalCompliance {
  const verde = pasos.filter((p) => p.cumplimiento === 'Cumple').length
  const amarillo = pasos.filter((p) => p.cumplimiento === 'Parcial').length
  const rojo = pasos.filter((p) => p.cumplimiento === 'No cumple').length
  const total = verde + amarillo + rojo
  const pct = total > 0 ? Math.round((verde / total) * 100) : 0
  return { pct, verde, amarillo, rojo, total }
}

export interface PesvFaseCompliance {
  fase: string
  promedioAvance: number
}

/** Agrupa los pasos PESV por fase (F1-F4) y promedia su `porcentajeAvance`
 * — a diferencia de `buildPesvGlobalCompliance` (que usa el campo
 * `cumplimiento`), esta usa el % de avance numérico porque el HTML de
 * referencia del cliente pide un promedio por fase, no un conteo de
 * estados. Pasos sin `porcentajeAvance` (null) se excluyen del promedio de
 * su fase — mismo criterio de "sin dato distinto de 0" que el resto del
 * sistema. Fases sin ningún paso con dato quedan con promedioAvance: 0 (no
 * hay división por cero) y aparecen igual en el resultado, en el orden fijo
 * F1-F4 (no el orden en que aparecen en `pasos`, que puede variar). */
export function buildPesvByFaseCompliance(pasos: RoadSafetyPesvPaso[]): PesvFaseCompliance[] {
  const FASES = ['F1', 'F2', 'F3', 'F4']
  return FASES.map((fase) => {
    const conDato = pasos.filter((p) => p.fase === fase && p.porcentajeAvance != null)
    const promedioAvance =
      conDato.length > 0
        ? Math.round(conDato.reduce((sum, p) => sum + (p.porcentajeAvance ?? 0), 0) / conDato.length)
        : 0
    return { fase, promedioAvance }
  })
}
