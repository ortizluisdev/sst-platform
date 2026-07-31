import { describe, it, expect } from 'vitest'
import {
  computeUploadCompliancePct,
  computeTendenciaGlobal,
  computeEvolucionIgho,
  computeProbabilidadIncumplimiento,
  type PeriodPoint,
} from './trendAnalysis.js'

describe('computeUploadCompliancePct', () => {
  it('calcula el % de lecturas VERDE', () => {
    expect(
      computeUploadCompliancePct([{ semaforo: 'VERDE' }, { semaforo: 'VERDE' }, { semaforo: 'ROJO' }, { semaforo: 'AMARILLO' }]),
    ).toBe(50)
  })

  it('carga sin lecturas => 0%, no división por cero', () => {
    expect(computeUploadCompliancePct([])).toBe(0)
  })
})

describe('computeTendenciaGlobal', () => {
  it('menos de 2 períodos => null (datos insuficientes)', () => {
    expect(computeTendenciaGlobal([])).toBeNull()
    expect(computeTendenciaGlobal([{ fecha: '2026-01-01', pct: 50 }])).toBeNull()
  })

  it('calcula el % de cambio relativo entre el último período y el anterior', () => {
    const periods: PeriodPoint[] = [
      { fecha: '2026-01-01', pct: 50 },
      { fecha: '2026-02-01', pct: 60 },
    ]
    expect(computeTendenciaGlobal(periods)).toEqual({ deltaPct: 20, actualPct: 60, anteriorPct: 50 })
  })

  it('período anterior en 0% => reporta el delta en puntos, no división por cero', () => {
    const periods: PeriodPoint[] = [
      { fecha: '2026-01-01', pct: 0 },
      { fecha: '2026-02-01', pct: 30 },
    ]
    expect(computeTendenciaGlobal(periods)).toEqual({ deltaPct: 30, actualPct: 30, anteriorPct: 0 })
  })
})

describe('computeEvolucionIgho', () => {
  it('menos de 2 períodos => null (datos insuficientes)', () => {
    expect(computeEvolucionIgho([{ fecha: '2026-01-01', pct: 50 }])).toBeNull()
  })

  it('devuelve como máximo los últimos 6 períodos, aunque haya más historial', () => {
    const periods: PeriodPoint[] = Array.from({ length: 9 }, (_, i) => ({ fecha: `2026-0${i + 1}-01`, pct: i * 10 }))
    const result = computeEvolucionIgho(periods)
    expect(result).toHaveLength(6)
    expect(result?.[0]?.fecha).toBe('2026-04-01') // los últimos 6 de 9 empiezan en el índice 3
    expect(result?.[5]?.fecha).toBe('2026-09-01')
  })
})

describe('computeProbabilidadIncumplimiento', () => {
  it('menos de 3 períodos => null (regresión con 2 puntos es un ajuste trivial)', () => {
    expect(
      computeProbabilidadIncumplimiento([
        { fecha: '2026-01-01', pct: 50 },
        { fecha: '2026-02-01', pct: 60 },
      ]),
    ).toBeNull()
  })

  it('tendencia de cumplimiento en descenso => probabilidad de incumplimiento proyectada > 0', () => {
    const periods: PeriodPoint[] = [
      { fecha: '2026-01-01', pct: 80 },
      { fecha: '2026-01-08', pct: 70 },
      { fecha: '2026-01-15', pct: 60 },
    ]
    const result = computeProbabilidadIncumplimiento(periods)
    expect(result).not.toBeNull()
    expect(result!.probabilidadPct).toBeGreaterThan(0)
    expect(result!.fechaProyeccion).toBe('2026-02-14')
  })

  it('cumplimiento estable en 100% => probabilidad proyectada de 0, acotada sin pasar a negativo', () => {
    const periods: PeriodPoint[] = [
      { fecha: '2026-01-01', pct: 100 },
      { fecha: '2026-01-08', pct: 100 },
      { fecha: '2026-01-15', pct: 100 },
    ]
    const result = computeProbabilidadIncumplimiento(periods)
    expect(result!.probabilidadPct).toBe(0)
  })
})
