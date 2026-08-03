import { describe, it, expect } from 'vitest'
import {
  calcularExposicionDiariaManoBrazo,
  calcularExposicionDiariaCuerpoEntero,
  calcularVDV,
  calcularFrecuenciaDominante,
} from './vibrationCalculations.js'

describe('calcularExposicionDiariaManoBrazo (VIB-06, ISO 5349-1)', () => {
  it('ahv=2.5, t=6h → A(8) = 2.5 × √(6/8) = 2.165', () => {
    const result = calcularExposicionDiariaManoBrazo({ ahv: 2.5, t: 6 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(2.165, 3)
  })

  it('t=8h → A(8) = ahv exactamente', () => {
    const result = calcularExposicionDiariaManoBrazo({ ahv: 3.1, t: 8 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(3.1, 10)
  })

  it('sin ahv → no calculable', () => {
    const result = calcularExposicionDiariaManoBrazo({ ahv: null, t: 6 })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta ahv (aceleración ponderada mano-brazo)' })
  })

  it('sin t → no calculable', () => {
    const result = calcularExposicionDiariaManoBrazo({ ahv: 2.5, t: null })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta t (tiempo de exposición)' })
  })
})

describe('calcularExposicionDiariaCuerpoEntero (VIB-08, ISO 2631-1)', () => {
  it('aw=0.8, t=7h → A(8) = 0.8 × √(7/8) = 0.7483', () => {
    const result = calcularExposicionDiariaCuerpoEntero({ aw: 0.8, t: 7 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(0.7483, 4)
  })

  it('sin aw → no calculable', () => {
    const result = calcularExposicionDiariaCuerpoEntero({ aw: null, t: 7 })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta aw (aceleración ponderada cuerpo entero)' })
  })
})

describe('calcularVDV (VIB-09, ISO 2631-1 — estimación por factor de cresta)', () => {
  it('aw=0.8, t=7h, factor_cresta=4 → VDV = 1.4 × 0.8 × 7^0.25 = 1.822', () => {
    const result = calcularVDV({ aw: 0.8, t: 7, factorCresta: 4 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(1.822, 2)
  })

  it('factor_cresta = 6 (límite) → "no aplica", nunca un número', () => {
    const result = calcularVDV({ aw: 0.8, t: 7, factorCresta: 6 })
    expect(result).toEqual({
      ok: false,
      reason: 'no aplica: factor de cresta fuera de rango válido para este método de estimación',
    })
  })

  it('factor_cresta > 6 → también "no aplica"', () => {
    const result = calcularVDV({ aw: 0.8, t: 7, factorCresta: 9 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('no aplica')
  })

  it('sin factor de cresta → no calculable (no "no aplica")', () => {
    const result = calcularVDV({ aw: 0.8, t: 7, factorCresta: null })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta factor de cresta' })
  })
})

describe('calcularFrecuenciaDominante (VIB-03, ISO 5349-1 / ISO 2631-1 — argmax sobre el espectro)', () => {
  it('espectro de ejemplo → 31.5 Hz (mayor aceleración)', () => {
    const espectro = [
      { frecuenciaHz: 8, aceleracion: 0.5 },
      { frecuenciaHz: 16, aceleracion: 1.2 },
      { frecuenciaHz: 31.5, aceleracion: 3.8 },
      { frecuenciaHz: 63, aceleracion: 2.1 },
      { frecuenciaHz: 125, aceleracion: 0.9 },
    ]
    const result = calcularFrecuenciaDominante(espectro)
    expect(result).toEqual({ ok: true, value: 31.5 })
  })

  it('sin espectro (null) → no calculable: falta espectro de frecuencias', () => {
    const result = calcularFrecuenciaDominante(null)
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta espectro de frecuencias' })
  })

  it('espectro vacío → mismo resultado que sin espectro', () => {
    const result = calcularFrecuenciaDominante([])
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta espectro de frecuencias' })
  })
})
