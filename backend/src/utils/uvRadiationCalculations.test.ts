import { describe, it, expect } from 'vitest'
import { calcularExposicionRadianteEfectiva, calcularTiempoMaximoExposicion, JORNADA_HORAS } from './uvRadiationCalculations.js'

describe('calcularExposicionRadianteEfectiva (RUV-03, dosimetría UV — ICNIRP/ACGIH)', () => {
  it('Eeff=0.4, jornada=8h (28800s) → Heff = 0.4 × 28800 = 11520 J/m²', () => {
    const result = calcularExposicionRadianteEfectiva({ eeff: 0.4, tSegundos: JORNADA_HORAS.DIURNA * 3600 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(11520, 6)
  })

  it('sin Eeff → no calculable', () => {
    const result = calcularExposicionRadianteEfectiva({ eeff: null, tSegundos: 28800 })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta Eeff (irradiancia efectiva)' })
  })

  it('sin tiempo de exposición → no calculable', () => {
    const result = calcularExposicionRadianteEfectiva({ eeff: 0.4, tSegundos: null })
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta tiempo de exposición' })
  })
})

describe('calcularTiempoMaximoExposicion (RUV-04, ICNIRP — límite 30 J/m² / ACGIH TLV)', () => {
  it('Eeff=0.4 → t_max = 30/0.4 = 75s = 0.0208h', () => {
    const result = calcularTiempoMaximoExposicion(0.4)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.segundos).toBeCloseTo(75, 6)
      expect(result.horas).toBeCloseTo(75 / 3600, 6)
    }
  })

  it('sin Eeff → no calculable', () => {
    const result = calcularTiempoMaximoExposicion(null)
    expect(result).toEqual({ ok: false, reason: 'no calculable: falta Eeff (irradiancia efectiva)' })
  })
})
