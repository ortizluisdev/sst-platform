import type { CategoryCardStatus } from '@/types/dashboard'

/** El backend (calculateSemaphore, backend/src/utils/semaphore.ts) marca
 * AMARILLO tanto cuando una lectura real está fuera de norma como cuando
 * el catálogo todavía no tiene limiteMin/limiteMax definidos para esa
 * variable — en ese segundo caso no hay nada con qué comparar, así que no
 * es una alerta real. Acá se separan para pintar: SIN_NORMA se muestra en
 * vez de AMARILLO/ROJO cuando NINGÚN límite está definido todavía. El
 * backend nunca devuelve SIN_NORMA (no existe en su enum) — el parámetro
 * lo acepta solo para que la función sea idempotente si ya se resolvió. */
export function resolveDisplayStatus(v: {
  estado: CategoryCardStatus
  limiteMin: number | null
  limiteMax: number | null
}): CategoryCardStatus {
  if (v.estado === 'SIN_DATOS' || v.estado === 'SIN_NORMA') return v.estado
  if (v.limiteMin == null && v.limiteMax == null) return 'SIN_NORMA'
  return v.estado
}
