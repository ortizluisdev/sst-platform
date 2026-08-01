import { describe, it, expect } from 'vitest'
import {
  resolveReportEstado,
  formatReferenciaNorma,
  resolveSentido,
  calculateHoja1Estado,
  impactoFromPrioridad,
} from './reportFormatting.js'

describe('resolveReportEstado', () => {
  it('SIN_DATOS => guión, sin importar los límites', () => {
    expect(resolveReportEstado({ estado: 'SIN_DATOS', limiteMin: 500, limiteMax: null })).toBe('—')
  })

  it('sin ningún límite definido => Informativo', () => {
    expect(resolveReportEstado({ estado: 'AMARILLO', limiteMin: null, limiteMax: null })).toBe('Informativo')
  })

  it('VERDE con límite definido => Cumple', () => {
    expect(resolveReportEstado({ estado: 'VERDE', limiteMin: 500, limiteMax: null })).toBe('Cumple')
  })

  it('AMARILLO/ROJO con límite definido => No cumple', () => {
    expect(resolveReportEstado({ estado: 'AMARILLO', limiteMin: 500, limiteMax: null })).toBe('No cumple')
    expect(resolveReportEstado({ estado: 'ROJO', limiteMin: null, limiteMax: 85 })).toBe('No cumple')
  })
})

describe('formatReferenciaNorma', () => {
  it('rango completo con unidad', () => {
    expect(formatReferenciaNorma(0.2, 0.4, '—')).toBe('0.2 – 0.4')
  })

  it('solo máximo, con unidad', () => {
    expect(formatReferenciaNorma(null, 85, 'dB(A)')).toBe('<= 85 dB(A)')
  })

  it('solo mínimo, con unidad', () => {
    expect(formatReferenciaNorma(500, null, 'lux')).toBe('>= 500 lux')
  })

  it('sin límites => guión', () => {
    expect(formatReferenciaNorma(null, null, 'lux')).toBe('—')
  })
})

describe('resolveSentido', () => {
  it('MIN_LIMIT con límite => min', () => {
    expect(resolveSentido('MIN_LIMIT', 500, null)).toBe('min')
  })

  it('MAX_LIMIT con límite => max', () => {
    expect(resolveSentido('MAX_LIMIT', null, 85)).toBe('max')
  })

  it('MIN_LIMIT sin límite definido => null', () => {
    expect(resolveSentido('MIN_LIMIT', null, null)).toBeNull()
  })

  it('RANGE con ambos límites => prioriza max', () => {
    expect(resolveSentido('RANGE', 0.2, 0.4)).toBe('max')
  })

  it('RANGE con solo mínimo => min', () => {
    expect(resolveSentido('RANGE', 0.2, null)).toBe('min')
  })
})

describe('calculateHoja1Estado', () => {
  it('sentido max: resultado <= límite => Cumple (fórmula IF de la plantilla)', () => {
    expect(calculateHoja1Estado(82, 85, 'max')).toBe('Cumple')
    expect(calculateHoja1Estado(90, 85, 'max')).toBe('No cumple')
  })

  it('sentido min: resultado >= límite => Cumple', () => {
    expect(calculateHoja1Estado(485, 500, 'min')).toBe('No cumple')
    expect(calculateHoja1Estado(510, 500, 'min')).toBe('Cumple')
  })

  it('resultado exactamente igual al límite => Cumple en ambos sentidos (inclusive)', () => {
    expect(calculateHoja1Estado(85, 85, 'max')).toBe('Cumple')
    expect(calculateHoja1Estado(500, 500, 'min')).toBe('Cumple')
  })
})

describe('impactoFromPrioridad', () => {
  it('mapea 1 a 1', () => {
    expect(impactoFromPrioridad('ALTA')).toBe('Alto')
    expect(impactoFromPrioridad('MEDIA')).toBe('Medio')
    expect(impactoFromPrioridad('BAJA')).toBe('Bajo')
  })
})
