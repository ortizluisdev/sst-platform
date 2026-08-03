export type CalculoResult = { ok: true; value: number } | { ok: false; reason: string }

function requireNumber(value: number | null | undefined, nombre: string): { ok: false; reason: string } | null {
  if (value == null || Number.isNaN(value)) return { ok: false, reason: `no calculable: falta ${nombre}` }
  return null
}

/** Duración en horas de cada jornada — decisión explícita (2026-08,
 * confirmada por el cliente al implementar RUV-03/RUV-04): las 3 categorías
 * de `jornada` (campo genérico compartido entre categorías, no una variable
 * dedicada) se tratan como turnos estándar de 8 horas. No es un default
 * adivinado — es la respuesta que dio el cliente cuando se le preguntó
 * explícitamente, porque `jornada` es categórico (DIURNA/NOCTURNA/MIXTA) y
 * no permite derivar un tiempo en segundos sin esta tabla. */
export const JORNADA_HORAS: Record<'DIURNA' | 'NOCTURNA' | 'MIXTA', number> = {
  DIURNA: 8,
  NOCTURNA: 8,
  MIXTA: 8,
}

/**
 * RUV-03 — Exposición radiante efectiva (Heff), dosimetría UV estándar
 * (ICNIRP / ACGIH TLV para radiación UV actínica ponderada espectralmente).
 * Heff (J/m²) = Eeff (W/m²) × t (segundos)
 */
export function calcularExposicionRadianteEfectiva(input: {
  eeff: number | null
  tSegundos: number | null
}): CalculoResult {
  const faltaEeff = requireNumber(input.eeff, 'Eeff (irradiancia efectiva)')
  if (faltaEeff) return faltaEeff
  const faltaT = requireNumber(input.tSegundos, 'tiempo de exposición')
  if (faltaT) return faltaT

  const value = input.eeff! * input.tSegundos!
  return { ok: true, value }
}

export type TiempoMaximoExposicionResult =
  | { ok: true; segundos: number; horas: number }
  | { ok: false; reason: string }

const LIMITE_HEFF_J_M2 = 30

/**
 * RUV-04 — Tiempo máximo de exposición, ICNIRP Guidelines on Limits of
 * Exposure to Ultraviolet Radiation (180-400 nm) / ACGIH TLV — límite de
 * 30 J/m² (3 mJ/cm²) por periodo de 8 horas, para radiación UV actínica
 * ponderada espectralmente.
 * t_max (segundos) = 30 / Eeff (W/m²)
 *
 * El catálogo (RUV-04) persiste el resultado en horas (unidad del catálogo),
 * pero el límite normativo está definido en segundos — por eso esta función
 * devuelve ambos valores, no solo el que termina guardado.
 */
export function calcularTiempoMaximoExposicion(eeff: number | null): TiempoMaximoExposicionResult {
  const faltaEeff = requireNumber(eeff, 'Eeff (irradiancia efectiva)')
  if (faltaEeff) return faltaEeff

  const segundos = LIMITE_HEFF_J_M2 / eeff!
  return { ok: true, segundos, horas: segundos / 3600 }
}
