import { describe, it, expect } from 'vitest'
import { calculatePuntajeIntervencion, classifyIntervencionPrioridad, classifyMatrizPosicion } from './interventionAnalysis.js'

describe('calculatePuntajeIntervencion', () => {
  it('ratio dentro de norma (<=1) => impacto 0, puntaje 0 sin importar la exposición', () => {
    expect(calculatePuntajeIntervencion(1, 8)).toEqual({ puntaje: 0, impacto: 0, exposicionFactor: 1 })
    expect(calculatePuntajeIntervencion(0.5, 8)).toEqual({ puntaje: 0, impacto: 0, exposicionFactor: 1 })
  })

  it('sin variable de exposición reportada (null) => asume jornada completa (factor 1)', () => {
    const result = calculatePuntajeIntervencion(2, null)
    expect(result.exposicionFactor).toBe(1)
    expect(result.puntaje).toBe(100)
  })

  it('exposición parcial reduce el puntaje proporcionalmente', () => {
    const result = calculatePuntajeIntervencion(2, 4) // 4h de 8h => factor 0.5
    expect(result.exposicionFactor).toBe(0.5)
    expect(result.impacto).toBe(1)
    expect(result.puntaje).toBe(50)
  })

  it('exposición reportada mayor a la jornada de referencia => factor acotado a 1', () => {
    const result = calculatePuntajeIntervencion(2, 12)
    expect(result.exposicionFactor).toBe(1)
  })
})

describe('classifyIntervencionPrioridad', () => {
  it('puntaje exactamente 70 => Alta (límite inclusive)', () => {
    expect(classifyIntervencionPrioridad(70)).toBe('ALTA')
  })

  it('puntaje exactamente 40 => Media (límite inclusive)', () => {
    expect(classifyIntervencionPrioridad(40)).toBe('MEDIA')
  })

  it('puntaje por debajo de 40 => Baja', () => {
    expect(classifyIntervencionPrioridad(39)).toBe('BAJA')
  })
})

describe('classifyMatrizPosicion', () => {
  it('cumplimiento alto + riesgo bajo => Aceptable', () => {
    expect(classifyMatrizPosicion(80, 'BAJO')).toBe('ACEPTABLE')
  })

  it('cumplimiento alto + riesgo medio/alto => Vigilar', () => {
    expect(classifyMatrizPosicion(80, 'MEDIO')).toBe('VIGILAR')
    expect(classifyMatrizPosicion(80, 'ALTO')).toBe('VIGILAR')
  })

  it('cumplimiento bajo + riesgo alto => Crítico', () => {
    expect(classifyMatrizPosicion(50, 'ALTO')).toBe('CRITICO')
  })

  it('cumplimiento bajo + riesgo bajo/medio => Prioritario', () => {
    expect(classifyMatrizPosicion(50, 'BAJO')).toBe('PRIORITARIO')
    expect(classifyMatrizPosicion(50, 'MEDIO')).toBe('PRIORITARIO')
  })

  it('cumplimiento exactamente en el umbral (70%) => se trata como alto', () => {
    expect(classifyMatrizPosicion(70, 'BAJO')).toBe('ACEPTABLE')
  })
})
