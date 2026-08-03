export type CalculoResult = { ok: true; value: number } | { ok: false; reason: string }

function requireNumber(value: number | null | undefined, nombre: string): { ok: false; reason: string } | null {
  if (value == null || Number.isNaN(value)) return { ok: false, reason: `no calculable: falta ${nombre}` }
  return null
}

const JORNADA_REFERENCIA_H = 8

/**
 * RUI-06 — Nivel de exposición diaria (LEX,8h), ISO 9612:2009 / ISO 1999.
 * LEX,8h = LAeq + 10*log10(t/8)
 */
export function calcularNivelExposicionDiaria(input: { laeq: number | null; t: number | null }): CalculoResult {
  const faltaLaeq = requireNumber(input.laeq, 'LAeq')
  if (faltaLaeq) return faltaLaeq
  const faltaT = requireNumber(input.t, 't (tiempo de exposición)')
  if (faltaT) return faltaT

  const value = input.laeq! + 10 * Math.log10(input.t! / JORNADA_REFERENCIA_H)
  return { ok: true, value }
}

/**
 * RUI-04 — Dosis de ruido (%), ISO 9612 (tasa de intercambio de 3 dB,
 * criterio de referencia 85 dB(A) para 8h — GTC 45 / Res. 1792 de 1990).
 * D(%) = 100 * 2^((LEX,8h - 85) / 3)
 */
export function calcularDosisRuido(lex8h: number | null): CalculoResult {
  const falta = requireNumber(lex8h, 'LEX,8h')
  if (falta) return falta

  const value = 100 * Math.pow(2, (lex8h! - 85) / 3)
  return { ok: true, value }
}
