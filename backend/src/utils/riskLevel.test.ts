import { describe, it, expect } from 'vitest'
import { calculateRiskRatio, classifyRiskRatio, averageRiskLevel } from './riskLevel.js'

describe('calculateRiskRatio', () => {
  it('MAX_LIMIT: ratio = valor / limiteMax', () => {
    expect(calculateRiskRatio(85, { comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 85 })).toBeCloseTo(1)
    expect(calculateRiskRatio(97.75, { comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 85 })).toBeCloseTo(1.15)
  })

  it('MIN_LIMIT: ratio = limiteMin / valor', () => {
    expect(calculateRiskRatio(500, { comparisonType: 'MIN_LIMIT', limiteMin: 500, limiteMax: null })).toBeCloseTo(1)
  })

  it('RANGE: dentro del rango => ratio 1 (Bajo)', () => {
    expect(calculateRiskRatio(0.3, { comparisonType: 'RANGE', limiteMin: 0.2, limiteMax: 0.4 })).toBe(1)
  })

  it('RANGE: por encima del máximo => ratio = valor / limiteMax', () => {
    expect(calculateRiskRatio(0.5, { comparisonType: 'RANGE', limiteMin: 0.2, limiteMax: 0.4 })).toBeCloseTo(1.25)
  })

  it('RANGE: por debajo del mínimo => ratio = limiteMin / valor', () => {
    expect(calculateRiskRatio(0.1, { comparisonType: 'RANGE', limiteMin: 0.2, limiteMax: 0.4 })).toBeCloseTo(2)
  })

  it('sin ningún límite definido (variable "sin norma") => null, se excluye', () => {
    expect(calculateRiskRatio(410, { comparisonType: 'RANGE', limiteMin: null, limiteMax: null })).toBeNull()
    expect(calculateRiskRatio(180, { comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: null })).toBeNull()
    expect(calculateRiskRatio(180, { comparisonType: 'MIN_LIMIT', limiteMin: null, limiteMax: null })).toBeNull()
  })
})

describe('classifyRiskRatio', () => {
  it('ratio exactamente 1.0 => Bajo (límite inclusive)', () => {
    expect(classifyRiskRatio(1.0)).toBe('BAJO')
  })

  it('ratio apenas sobre 1.0 => Medio', () => {
    expect(classifyRiskRatio(1.01)).toBe('MEDIO')
  })

  it('ratio exactamente 1.15 => Medio (límite inclusive)', () => {
    expect(classifyRiskRatio(1.15)).toBe('MEDIO')
  })

  it('ratio apenas sobre 1.15 => Alto', () => {
    expect(classifyRiskRatio(1.151)).toBe('ALTO')
  })
})

describe('averageRiskLevel', () => {
  it('lista vacía (todas las variables sin norma) => null, nada que promediar', () => {
    expect(averageRiskLevel([])).toBeNull()
  })

  it('promedia y redondea a la banda más cercana', () => {
    expect(averageRiskLevel(['BAJO', 'BAJO'])).toEqual({ nivel: 'BAJO', promedio: 1 })
    expect(averageRiskLevel(['BAJO', 'ALTO'])).toEqual({ nivel: 'MEDIO', promedio: 2 })
    expect(averageRiskLevel(['MEDIO', 'ALTO', 'ALTO'])).toEqual({ nivel: 'ALTO', promedio: 8 / 3 })
  })
})
