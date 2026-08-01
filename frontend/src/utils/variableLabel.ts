import type { Locale } from '@/i18n'

/**
 * `variable.nombre` viene del catálogo de VariableDefinition (dato de
 * negocio en la base de datos, sembrado en español) — no es una clave de
 * i18n. Mismo patrón que categoryLabel.ts/serviceLabel.ts: traducción de
 * EXHIBICIÓN por `codigo` (estable, a diferencia de `nombre`), sin tocar el
 * backend. Si una variable no está mapeada (ej. una nueva del catálogo), se
 * muestra el nombre tal cual llega — nunca se rompe.
 */
const VARIABLE_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  // Estrés Térmico
  'TER-01': { en: 'Air temperature (dry bulb)' },
  'TER-02': { en: 'Relative humidity' },
  'TER-03': { en: 'WBGT Index' },
  'TER-04': { en: 'Predicted Mean Vote (PMV)' },
  'TER-05': { en: 'Globe temperature' },
  'TER-06': { en: 'Natural wet bulb temperature' },
  'TER-07': { en: 'Mean radiant temperature' },
  'TER-08': { en: 'Air velocity' },
  'TER-09': { en: 'Predicted Percentage of Dissatisfied (PPD)' },
  'TER-10': { en: 'Metabolic rate' },
  'TER-11': { en: 'Clothing insulation' },
  'TER-12': { en: 'Work/rest regimen' },
  'TER-13': { en: 'Allowed work time' },
  'TER-14': { en: 'Required rest time' },
  // Iluminación
  'ILU-01': { en: 'Average horizontal illuminance' },
  'ILU-02': { en: 'Uniformity' },
  'ILU-03': { en: 'Unified Glare Rating (UGR)' },
  'ILU-04': { en: 'Work surface reflectance' },
  'ILU-05': { en: 'Horizontal illuminance (per point)' },
  'ILU-06': { en: 'Vertical illuminance (by height)' },
  'ILU-07': { en: 'Cylindrical illuminance' },
  'ILU-08': { en: 'Floor reflectance' },
  'ILU-09': { en: 'Wall reflectance' },
  'ILU-10': { en: 'Ceiling reflectance' },
  'ILU-11': { en: 'Luminance' },
  'ILU-12': { en: 'Room index' },
  'ILU-13': { en: 'Daylight factor' },
  'ILU-14': { en: 'Vertical illuminance (0.0 m)' },
  'ILU-15': { en: 'Vertical illuminance (1.0 m)' },
  'ILU-16': { en: 'Vertical illuminance (1.5 m)' },
  // Radiación UV
  'RUV-01': { en: 'UV Index' },
  'RUV-02': { en: 'Effective irradiance' },
  'RUV-03': { en: 'Effective radiant exposure' },
  'RUV-04': { en: 'Maximum exposure time' },
  'RUV-05': { en: 'Irradiance by band (UV-A/B/C)' },
  'RUV-06': { en: 'UV-A irradiance' },
  'RUV-07': { en: 'UV-B irradiance' },
  'RUV-08': { en: 'UV-C irradiance' },
  // Sonido
  'RUI-01': { en: 'Average sound level (LAeq,8h)' },
  'RUI-02': { en: 'Peak level (LC,peak)' },
  'RUI-03': { en: 'Exposure time' },
  'RUI-04': { en: 'Noise dose' },
  'RUI-05': { en: 'Equivalent continuous level (A)' },
  'RUI-06': { en: 'Daily exposure level' },
  'RUI-07': { en: 'Sound pressure level' },
  'RUI-08': { en: 'Statistical percentiles (L10/L50/L90)' },
  'RUI-09': { en: 'Octave band analysis' },
  'RUI-10': { en: 'Hearing protector attenuation' },
  'RUI-11': { en: 'L10 percentile' },
  'RUI-12': { en: 'L50 percentile' },
  'RUI-13': { en: 'L90 percentile' },
  'RUI-14': { en: '31.5 Hz band level' },
  'RUI-15': { en: '63 Hz band level' },
  'RUI-16': { en: '125 Hz band level' },
  'RUI-17': { en: '250 Hz band level' },
  'RUI-18': { en: '500 Hz band level' },
  'RUI-19': { en: '1000 Hz band level' },
  'RUI-20': { en: '2000 Hz band level' },
  'RUI-21': { en: '4000 Hz band level' },
  'RUI-22': { en: '8000 Hz band level' },
  // Vibración
  'VIB-01': { en: 'Hand-arm (A(8))' },
  'VIB-02': { en: 'Whole body (A(8))' },
  'VIB-03': { en: 'Dominant frequency' },
  'VIB-04': { en: 'Exposure time' },
  'VIB-05': { en: 'Weighted hand-arm acceleration' },
  'VIB-06': { en: 'Daily hand-arm exposure (A(8))' },
  'VIB-07': { en: 'Weighted whole-body acceleration' },
  'VIB-08': { en: 'Daily whole-body exposure (A(8))' },
  'VIB-09': { en: 'Vibration Dose Value (VDV)' },
}

export function variableLabel(codigo: string, nombre: string, locale: Locale): string {
  return VARIABLE_LABELS[codigo]?.[locale] ?? nombre
}
