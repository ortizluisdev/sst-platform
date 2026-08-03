import { describe, it, expect } from 'vitest'
import { calcularNivelExposicionDiaria, calcularDosisRuido } from './soundCalculations.js'

describe('calcularNivelExposicionDiaria (RUI-06, ISO 9612:2009 / ISO 1999)', () => {
  it('LAeq=82.4, t=6.2h → LEX,8h=81.29 dB(A)', () => {
    const result = calcularNivelExposicionDiaria({ laeq: 82.4, t: 6.2 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(81.29, 2)
  })

  it('t=8h → LEX,8h = LAeq exactamente', () => {
    const result = calcularNivelExposicionDiaria({ laeq: 90, t: 8 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(90, 10)
  })

  it('sin LAeq → no calculable', () => {
    const result = calcularNivelExposicionDiaria({ laeq: null, t: 6.2 })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta LAeq' })
  })

  it('sin t → no calculable', () => {
    const result = calcularNivelExposicionDiaria({ laeq: 82.4, t: null })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta t (tiempo de exposición)' })
  })
})

describe('calcularDosisRuido (RUI-04, ISO 9612 — tasa de intercambio 3 dB)', () => {
  it('LEX,8h=81.29 → D=42.47% (encadenado con el caso anterior)', () => {
    const result = calcularDosisRuido(81.29)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(42.47, 1)
  })

  it('LEX,8h=85 (límite) → D=100% exacto', () => {
    const result = calcularDosisRuido(85)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(100, 10)
  })

  it('sin LEX,8h → no calculable', () => {
    const result = calcularDosisRuido(null)
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta LEX,8h' })
  })
})
