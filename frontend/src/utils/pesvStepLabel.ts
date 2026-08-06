import type { Locale } from '@/i18n'

/**
 * `elemento` viene del catálogo fijo de los 24 pasos PESV (Resolución 40595
 * de 2022, hardcodeado en backend/src/utils/roadSafetyConstants.ts porque
 * nunca cambia entre clientes) — no es una clave de i18n. Mismo patrón que
 * variableLabel.ts/categoryLabel.ts: traducción de EXHIBICIÓN por `paso`
 * (estable, a diferencia del texto), sin tocar el backend. La Resolución
 * 40595 es una norma colombiana sin traducción oficial al inglés — esta es
 * una traducción literal/técnica, no una denominación regulatoria oficial.
 * Si un paso no está mapeado, se muestra el texto tal cual llega — nunca se
 * rompe.
 */
const PESV_STEP_LABELS: Record<number, Partial<Record<Locale, string>>> = {
  1: { en: 'PESV design and implementation lead' },
  2: { en: 'Road safety committee' },
  3: { en: "Organization's road safety policy" },
  4: { en: 'Leadership, commitment, and shared accountability from senior management' },
  5: { en: 'Diagnosis' },
  6: { en: 'Risk characterization, assessment, and control' },
  7: { en: 'PESV objectives and goals' },
  8: { en: 'Critical risk management programs and performance factors' },
  9: { en: 'Annual work plan' },
  10: { en: 'Competency and annual training plan' },
  11: { en: 'Human behavior (selection, documentation, and safe conduct)' },
  12: { en: 'Victim assistance — response protocol' },
  13: { en: 'Victim assistance — road crash investigation' },
  14: { en: 'Safe infrastructure — commutes and routes' },
  15: { en: 'Safe infrastructure — facilities and physical environment' },
  16: { en: 'Safe vehicles — preventive and corrective maintenance' },
  17: { en: 'Safe vehicles — inspection and documentation' },
  18: { en: 'Additional step, Res. 40595 (adjust name per matrix)' },
  19: { en: 'Additional step, Res. 40595 (adjust name per matrix)' },
  20: { en: 'PESV self-management indicators and reporting' },
  21: { en: 'Statistical recording and analysis of road crashes' },
  22: { en: 'Annual audit' },
  23: { en: 'Continuous improvement, preventive and corrective actions' },
  24: { en: 'Communication and participation mechanisms' },
}

export function pesvStepLabel(paso: number, elemento: string, locale: Locale): string {
  return PESV_STEP_LABELS[paso]?.[locale] ?? elemento
}

/** `nivelAplicable` — mismo catálogo fijo, mismo criterio. */
const NIVEL_APLICABLE_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  Todos: { en: 'All' },
  'Estándar y Avanzado': { en: 'Standard and Advanced' },
  Avanzado: { en: 'Advanced' },
}

export function nivelAplicableLabel(nivel: string | null, locale: Locale): string | null {
  if (nivel == null) return null
  return NIVEL_APLICABLE_LABELS[nivel]?.[locale] ?? nivel
}

/** `cumplimiento` — mismo catálogo fijo (3 valores posibles), mismo criterio. */
const CUMPLIMIENTO_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  Cumple: { en: 'Compliant' },
  Parcial: { en: 'Partial' },
  'No cumple': { en: 'Non-compliant' },
}

export function cumplimientoLabel(cumplimiento: string | null, locale: Locale): string | null {
  if (cumplimiento == null) return null
  return CUMPLIMIENTO_LABELS[cumplimiento]?.[locale] ?? cumplimiento
}
