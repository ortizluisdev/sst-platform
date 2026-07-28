import type { VariableSummary } from '@/types/dashboard'

/** Valor mostrado en las tarjetas-resumen: '—' cuando aún no hay ninguna
 * lectura cargada (SIN_DATOS) — un "0 lux"/"0 dB(A)" numérico podría leerse
 * como una medición real en vez de ausencia de datos. */
export function formatSummaryValue(v: Pick<VariableSummary, 'estado' | 'promedio' | 'unidadMedida'>): string {
  return v.estado === 'SIN_DATOS' ? '—' : `${v.promedio} ${v.unidadMedida}`
}
