export type CalculoResult = { ok: true; value: number } | { ok: false; reason: string }

function requireNumber(value: number | null | undefined, nombre: string): { ok: false; reason: string } | null {
  if (value == null || Number.isNaN(value)) return { ok: false, reason: `no calculable: falta ${nombre}` }
  return null
}

const JORNADA_REFERENCIA_H = 8

/**
 * VIB-06 — Exposición diaria mano-brazo A(8), ISO 5349-1.
 * A(8) = ahv × √(t/8)
 */
export function calcularExposicionDiariaManoBrazo(input: { ahv: number | null; t: number | null }): CalculoResult {
  const faltaAhv = requireNumber(input.ahv, 'ahv (aceleración ponderada mano-brazo)')
  if (faltaAhv) return faltaAhv
  const faltaT = requireNumber(input.t, 't (tiempo de exposición)')
  if (faltaT) return faltaT

  const value = input.ahv! * Math.sqrt(input.t! / JORNADA_REFERENCIA_H)
  return { ok: true, value }
}

/**
 * VIB-08 — Exposición diaria cuerpo entero A(8), ISO 2631-1.
 * A(8) = aw × √(t/8)
 */
export function calcularExposicionDiariaCuerpoEntero(input: { aw: number | null; t: number | null }): CalculoResult {
  const faltaAw = requireNumber(input.aw, 'aw (aceleración ponderada cuerpo entero)')
  if (faltaAw) return faltaAw
  const faltaT = requireNumber(input.t, 't (tiempo de exposición)')
  if (faltaT) return faltaT

  const value = input.aw! * Math.sqrt(input.t! / JORNADA_REFERENCIA_H)
  return { ok: true, value }
}

const FACTOR_CRESTA_LIMITE = 6
const VDV_K = 1.4

/**
 * VIB-09 — Valor de dosis de vibración (VDV), estimado — ISO 2631-1, método
 * de estimación por factor de cresta (aproximación usada cuando no se tiene
 * la señal cruda de aceleración).
 * VDV = k × aw × t^0.25, válido solo si factor_cresta < 6.
 *
 * TODO: confirmar con higienista si VDV debe evaluarse también sobre
 * mano-brazo (ahv, VIB-05) — el catálogo original no lo especifica. Se
 * implementó sobre cuerpo entero (aw, VIB-07) porque es el método de
 * evaluación más común en ese contexto (ISO 2631, conductores/operarios de
 * vehículos), pero es una suposición, no un hecho confirmado.
 *
 * k = 1.4 es un valor conservador para cuando no se distingue eje x/y/z de
 * la señal — no es un factor normativo fijo, es una simplificación
 * documentada aquí a propósito.
 */
export function calcularVDV(input: { aw: number | null; t: number | null; factorCresta: number | null }): CalculoResult {
  const faltaAw = requireNumber(input.aw, 'aw (aceleración ponderada cuerpo entero)')
  if (faltaAw) return faltaAw
  const faltaT = requireNumber(input.t, 't (tiempo de exposición)')
  if (faltaT) return faltaT
  const faltaFactorCresta = requireNumber(input.factorCresta, 'factor de cresta')
  if (faltaFactorCresta) return faltaFactorCresta

  if (input.factorCresta! >= FACTOR_CRESTA_LIMITE) {
    return { ok: false, reason: 'no aplica: factor de cresta fuera de rango válido para este método de estimación' }
  }

  const value = VDV_K * input.aw! * Math.pow(input.t!, 0.25)
  return { ok: true, value }
}

export interface EspectroPunto {
  frecuenciaHz: number
  aceleracion: number
}

/**
 * VIB-03 — Frecuencia dominante, análisis espectral en bandas de tercio de
 * octava (ISO 5349-1 para mano-brazo, 8–1250 Hz; ISO 2631-1 para cuerpo
 * entero, 0.5–80 Hz — confirmar con el equipo real cuál rango reportan sus
 * vibrómetros). Es un argmax sobre el espectro capturado: la frecuencia con
 * mayor aceleración.
 *
 * No se deriva de ahv/aw (VIB-05/VIB-07): esos valores ya están ponderados
 * y resumidos en un solo número, no permiten reconstruir en qué frecuencia
 * está la energía dominante — solo el espectro completo puede responder
 * esta pregunta.
 *
 * Deliberadamente desacoplada del formato de columnas de origen: recibe ya
 * una lista de pares (frecuencia, aceleración), no un buffer/archivo — el
 * parser real (formato exacto que exporta el vibrómetro, sin confirmar
 * todavía con el cliente) es responsabilidad de quien llame a esta función.
 */
export function calcularFrecuenciaDominante(espectro: EspectroPunto[] | null): CalculoResult {
  if (espectro == null || espectro.length === 0) {
    return { ok: false, reason: 'no calculable: falta espectro de frecuencias' }
  }

  const dominante = espectro.reduce((max, punto) => (punto.aceleracion > max.aceleracion ? punto : max))
  return { ok: true, value: dominante.frecuenciaHz }
}
