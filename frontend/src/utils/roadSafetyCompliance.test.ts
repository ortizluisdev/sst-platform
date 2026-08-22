import { describe, it, expect } from 'vitest'
import { classifyPesvCompliance, buildPesvGlobalCompliance, buildPesvByFaseCompliance } from './roadSafetyCompliance'
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

function pasoFase(fase: string, porcentajeAvance: number | null): RoadSafetyPesvPaso {
  return {
    fase,
    paso: 1,
    elemento: 'Elemento de prueba',
    nivelAplicable: null,
    cumplimiento: null,
    porcentajeAvance,
    evidencia: null,
    observaciones: null,
  }
}

describe('buildPesvByFaseCompliance', () => {
  it('agrupa por fase y promedia porcentajeAvance', () => {
    const pasos = [pasoFase('F1', 100), pasoFase('F1', 50), pasoFase('F2', 80)]
    const result = buildPesvByFaseCompliance(pasos)
    expect(result).toEqual([
      { fase: 'F1', promedioAvance: 75 },
      { fase: 'F2', promedioAvance: 80 },
      { fase: 'F3', promedioAvance: 0 },
      { fase: 'F4', promedioAvance: 0 },
    ])
  })

  it('siempre devuelve las 4 fases en orden F1-F4, aunque falten pasos de alguna', () => {
    const result = buildPesvByFaseCompliance([pasoFase('F3', 60)])
    expect(result.map((f) => f.fase)).toEqual(['F1', 'F2', 'F3', 'F4'])
  })

  it('ignora pasos con porcentajeAvance null al promediar', () => {
    const pasos = [pasoFase('F1', 100), pasoFase('F1', null)]
    const result = buildPesvByFaseCompliance(pasos)
    expect(result.find((f) => f.fase === 'F1')).toEqual({ fase: 'F1', promedioAvance: 100 })
  })

  it('fase sin ningún paso con dato → promedioAvance 0 (no división por cero)', () => {
    const result = buildPesvByFaseCompliance([pasoFase('F1', null)])
    expect(result.find((f) => f.fase === 'F1')).toEqual({ fase: 'F1', promedioAvance: 0 })
  })

  it('arreglo vacío → las 4 fases en 0', () => {
    const result = buildPesvByFaseCompliance([])
    expect(result).toEqual([
      { fase: 'F1', promedioAvance: 0 },
      { fase: 'F2', promedioAvance: 0 },
      { fase: 'F3', promedioAvance: 0 },
      { fase: 'F4', promedioAvance: 0 },
    ])
  })
})
