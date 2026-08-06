import { describe, it, expect } from 'vitest'
import { classifyPesvCompliance, buildPesvGlobalCompliance } from './roadSafetyCompliance'
import type { RoadSafetyPesvPaso } from '@/types/roadSafety'

describe('classifyPesvCompliance', () => {
  it('null → SIN_DATOS', () => {
    expect(classifyPesvCompliance(null)).toBe('SIN_DATOS')
  })

  it('80 (límite inferior VERDE) → VERDE', () => {
    expect(classifyPesvCompliance(80)).toBe('VERDE')
  })

  it('100 → VERDE', () => {
    expect(classifyPesvCompliance(100)).toBe('VERDE')
  })

  it('79 (justo debajo del límite VERDE) → AMARILLO', () => {
    expect(classifyPesvCompliance(79)).toBe('AMARILLO')
  })

  it('60 (límite inferior AMARILLO) → AMARILLO', () => {
    expect(classifyPesvCompliance(60)).toBe('AMARILLO')
  })

  it('59 (justo debajo del límite AMARILLO) → ROJO', () => {
    expect(classifyPesvCompliance(59)).toBe('ROJO')
  })

  it('0 → ROJO', () => {
    expect(classifyPesvCompliance(0)).toBe('ROJO')
  })
})

function paso(cumplimiento: RoadSafetyPesvPaso['cumplimiento']): RoadSafetyPesvPaso {
  return {
    fase: 'F1',
    paso: 1,
    elemento: 'Elemento de prueba',
    nivelAplicable: null,
    cumplimiento,
    porcentajeAvance: null,
    evidencia: null,
    observaciones: null,
  }
}

describe('buildPesvGlobalCompliance', () => {
  it('cuenta cada estado por separado y calcula pct = verde/total', () => {
    const pasos = [paso('Cumple'), paso('Cumple'), paso('Parcial'), paso('No cumple')]
    expect(buildPesvGlobalCompliance(pasos)).toEqual({ pct: 50, verde: 2, amarillo: 1, rojo: 1, total: 4 })
  })

  it('ignora pasos sin cumplimiento (null) al contar el total', () => {
    const pasos = [paso('Cumple'), paso(null)]
    expect(buildPesvGlobalCompliance(pasos)).toEqual({ pct: 100, verde: 1, amarillo: 0, rojo: 0, total: 1 })
  })

  it('arreglo vacío → total 0, pct 0 (no división por cero)', () => {
    expect(buildPesvGlobalCompliance([])).toEqual({ pct: 0, verde: 0, amarillo: 0, rojo: 0, total: 0 })
  })
})
