import { describe, it, expect } from 'vitest'
import {
  calcularTemperaturaRadianteMedia,
  calcularWBGT,
  calcularPMV,
  calcularPPD,
  calcularRegimenTrabajoDescanso,
  clasificarCategoriaTrabajo,
} from './thermalStressCalculations.js'

describe('calcularTemperaturaRadianteMedia (TER-07, ISO 7726:1998)', () => {
  it('calcula Tr con convección forzada', () => {
    const result = calcularTemperaturaRadianteMedia({ tg: 33, ta: 29.1, va: 0.3 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Tg > Ta y Va moderada — Tr debe quedar por encima de Tg (el globo
      // "ve" más radiación de la que el aire solo explicaría).
      expect(result.value).toBeGreaterThan(33)
      expect(result.value).toBeCloseTo(37.0, 1)
    }
  })

  it('falla explícito si falta un input, sin asumir valor por defecto', () => {
    expect(calcularTemperaturaRadianteMedia({ tg: null, ta: 29, va: 0.3 })).toEqual({
      ok: false,
      reason: 'no calculable: falta Tg (temperatura de globo)',
    })
  })
})

describe('calcularWBGT (TER-03, ISO 7243:2017)', () => {
  it('caso de verificación dado: Tnw=22, Tg=28, interior → WBGT=23.8°C', () => {
    const result = calcularWBGT({ tnw: 22, tg: 28, ta: null, exposicionSolar: false })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(23.8, 10)
  })

  it('exterior (con carga solar) usa la fórmula de 3 términos', () => {
    const result = calcularWBGT({ tnw: 22, tg: 28, ta: 30, exposicionSolar: true })
    expect(result.ok).toBe(true)
    if (result.ok) {
      // 0.7×22 + 0.2×28 + 0.1×30 = 15.4 + 5.6 + 3 = 24.0
      expect(result.value).toBeCloseTo(24.0, 5)
    }
  })

  it('exterior sin Ta falla explícito (no cae al caso interior)', () => {
    expect(calcularWBGT({ tnw: 22, tg: 28, ta: null, exposicionSolar: true })).toEqual({
      ok: false,
      reason: 'no calculable: falta Ta (temperatura del aire) — requerido para WBGT con exposición solar',
    })
  })
})

describe('calcularPMV / calcularPPD (TER-04/TER-09, ISO 7730:2005 — Fanger)', () => {
  it('PPD con PMV=0 → 5% exacto (caso trivial)', () => {
    const result = calcularPPD(0)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(5, 5)
  })

  it('PMV converge a un valor estable (sanity check, no compara contra librería externa acá)', () => {
    const result = calcularPMV({ ta: 24, tr: 24, va: 0.1, hr: 50, m: 70, icl: 0.5 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Ambiente de confort típico (24°C, actividad sedentaria, ropa ligera)
      // — el PMV debe quedar cerca de 0, no en un extremo (-3/+3).
      expect(result.value).toBeGreaterThan(-1)
      expect(result.value).toBeLessThan(1)
    }
  })

  it('regresión: caso que antes divergía (oscilaba sin converger) da un PMV físicamente válido', () => {
    // Ta=28/Tr=28/Va=0.2/HR=60/M=100/Icl=0.6 — con sustitución simple sin
    // relajación, esta combinación oscilaba entre ~28°C y ~33°C durante
    // las 150 iteraciones y devolvía PMV≈10.8 (fuera de todo rango
    // físico) al tope de iteraciones. Con relajación converge a ≈1.47,
    // que coincide con pythermalcomfort (ISO 7730) dentro de ±0.01.
    const result = calcularPMV({ ta: 28, tr: 28, va: 0.2, hr: 60, m: 100, icl: 0.6 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeGreaterThan(-3)
      expect(result.value).toBeLessThan(3)
      expect(result.value).toBeCloseTo(1.4722, 1)
    }
  })

  it('falla explícito si falta un input de PMV', () => {
    expect(calcularPMV({ ta: 24, tr: null, va: 0.1, hr: 50, m: 70, icl: 0.5 })).toEqual({
      ok: false,
      reason: 'no calculable: falta Tr (temperatura radiante media)',
    })
  })

  it('PPD encadenado con un PMV alto da un PPD alto (>50%)', () => {
    const pmvResult = calcularPMV({ ta: 32, tr: 34, va: 0.1, hr: 70, m: 165, icl: 0.6 })
    expect(pmvResult.ok).toBe(true)
    if (pmvResult.ok) {
      const ppdResult = calcularPPD(pmvResult.value)
      expect(ppdResult.ok).toBe(true)
      if (ppdResult.ok) expect(ppdResult.value).toBeGreaterThan(50)
    }
  })
})

describe('clasificarCategoriaTrabajo (ACGIH)', () => {
  it('clasifica los 4 escalones por M', () => {
    expect(clasificarCategoriaTrabajo(200)).toBe('LIGERO')
    expect(clasificarCategoriaTrabajo(234)).toBe('LIGERO')
    expect(clasificarCategoriaTrabajo(300)).toBe('MODERADO')
    expect(clasificarCategoriaTrabajo(400)).toBe('PESADO')
    expect(clasificarCategoriaTrabajo(500)).toBe('MUY_PESADO')
  })
})

describe('calcularRegimenTrabajoDescanso (TER-13/TER-14, ACGIH TLVs/BEIs)', () => {
  it('WBGT por debajo del límite de trabajo continuo → 60 min trabajo, 0 min descanso', () => {
    const result = calcularRegimenTrabajoDescanso({ wbgt: 24, m: 300 }) // Moderado, límite continuo 26.7
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        categoria: 'MODERADO',
        pctTrabajo: 100,
        tiempoTrabajoPermitidoMin: 60,
        tiempoDescansoRequeridoMin: 0,
        estado: 'NORMAL',
      })
    }
  })

  it('WBGT en un escalón intermedio (sin interpolar) — Ligero, WBGT=31', () => {
    // Ligero: continuo 30.0, 75/25 30.6, 50/50 31.7, 25/75 32.2 — 31 cae en el escalón 50/50
    const result = calcularRegimenTrabajoDescanso({ wbgt: 31, m: 150 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        categoria: 'LIGERO',
        pctTrabajo: 50,
        tiempoTrabajoPermitidoMin: 30,
        tiempoDescansoRequeridoMin: 30,
        estado: 'NORMAL',
      })
    }
  })

  it('WBGT por encima del límite de 25% trabajo → parar actividad (0%, Crítico)', () => {
    const result = calcularRegimenTrabajoDescanso({ wbgt: 35, m: 300 }) // Moderado, límite 25% = 31.1
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        categoria: 'MODERADO',
        pctTrabajo: 0,
        tiempoTrabajoPermitidoMin: 0,
        tiempoDescansoRequeridoMin: 60,
        estado: 'CRITICO',
      })
    }
  })

  it('Muy pesado devuelve "sin datos" explícito, nunca un número inventado', () => {
    const result = calcularRegimenTrabajoDescanso({ wbgt: 28, m: 500 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        categoria: 'MUY_PESADO',
        pctTrabajo: null,
        tiempoTrabajoPermitidoMin: null,
        tiempoDescansoRequeridoMin: null,
        estado: 'SIN_DATOS',
      })
    }
  })

  it('falla explícito si falta WBGT o M', () => {
    expect(calcularRegimenTrabajoDescanso({ wbgt: null, m: 300 })).toEqual({
      ok: false,
      reason: 'no calculable: falta WBGT',
    })
  })
})
