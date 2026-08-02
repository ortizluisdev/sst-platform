import { describe, it, expect } from 'vitest'
import {
  diasHasta,
  anomaliaConsumoPct,
  calcularAlertaVehiculo,
  calcularIcc,
  calcularResultadoConductor,
  calcularAlertaConductor,
  calcularCumplimientoPesv,
} from './roadSafetyCalculations.js'

describe('diasHasta', () => {
  it('retorna null sin fecha', () => {
    expect(diasHasta(null)).toBeNull()
  })

  it('retorna positivo para una fecha futura', () => {
    const futura = new Date()
    futura.setDate(futura.getDate() + 10)
    expect(diasHasta(futura)).toBe(10)
  })

  it('retorna negativo para una fecha vencida', () => {
    const vencida = new Date()
    vencida.setDate(vencida.getDate() - 5)
    expect(diasHasta(vencida)).toBe(-5)
  })
})

describe('anomaliaConsumoPct', () => {
  it('retorna null sin datos', () => {
    expect(anomaliaConsumoPct(null, 30)).toBeNull()
    expect(anomaliaConsumoPct(28, null)).toBeNull()
  })

  it('retorna 0 si la base es 0 (evita división por cero)', () => {
    expect(anomaliaConsumoPct(10, 0)).toBe(0)
  })

  it('calcula el porcentaje cuando el rendimiento real es menor a la base', () => {
    expect(anomaliaConsumoPct(28, 30)).toBe(7)
  })

  it('da negativo cuando el rendimiento real supera la base', () => {
    expect(anomaliaConsumoPct(33, 30)).toBe(-10)
  })
})

describe('calcularAlertaVehiculo', () => {
  const base = {
    diasSoat: 100,
    diasRtm: 100,
    comparendos: 0,
    kmActual: 1000,
    kmProxMant: 5000,
    anomaliaConsumoPct: 0,
    llantasLabradoMm: 5,
    pruebaFrenado: 'OK',
  }

  it('OK cuando todo está en regla', () => {
    expect(calcularAlertaVehiculo(base)).toBe('OK')
  })

  it('VENCIDO si el SOAT ya venció', () => {
    expect(calcularAlertaVehiculo({ ...base, diasSoat: -1 })).toBe('VENCIDO')
  })

  it('VENCIDO si el RTM ya venció', () => {
    expect(calcularAlertaVehiculo({ ...base, diasRtm: 0 })).toBe('VENCIDO')
  })

  it('ALERTA si el SOAT vence en 30 días o menos', () => {
    expect(calcularAlertaVehiculo({ ...base, diasSoat: 30 })).toBe('ALERTA')
  })

  it('ALERTA si tiene comparendos', () => {
    expect(calcularAlertaVehiculo({ ...base, comparendos: 1 })).toBe('ALERTA')
  })

  it('ALERTA si el km actual superó el km de próximo mantenimiento', () => {
    expect(calcularAlertaVehiculo({ ...base, kmActual: 5000, kmProxMant: 5000 })).toBe('ALERTA')
  })

  it('ALERTA si la anomalía de consumo es >= 15%', () => {
    expect(calcularAlertaVehiculo({ ...base, anomaliaConsumoPct: 15 })).toBe('ALERTA')
  })

  it('ALERTA si el labrado de llantas es menor a 2mm', () => {
    expect(calcularAlertaVehiculo({ ...base, llantasLabradoMm: 1.9 })).toBe('ALERTA')
  })

  it('ALERTA si la prueba de frenado está en Falla', () => {
    expect(calcularAlertaVehiculo({ ...base, pruebaFrenado: 'Falla' })).toBe('ALERTA')
  })

  it('VENCIDO tiene prioridad sobre ALERTA', () => {
    expect(calcularAlertaVehiculo({ ...base, diasSoat: -1, comparendos: 5 })).toBe('VENCIDO')
  })
})

describe('calcularIcc', () => {
  it('retorna null sin evaluaciones', () => {
    expect(calcularIcc([null, null])).toBeNull()
  })

  it('promedia las 9 evaluaciones', () => {
    expect(calcularIcc([88, 90, 85, 82, 90, 85, 84, 80, 86])).toBe(86)
  })

  it('ignora evaluaciones sin dato en vez de tratarlas como 0', () => {
    expect(calcularIcc([80, 80, null])).toBe(80)
  })
})

describe('calcularResultadoConductor', () => {
  it('Aprobado si ICC >= 70', () => {
    expect(calcularResultadoConductor(70)).toBe('Aprobado')
    expect(calcularResultadoConductor(86)).toBe('Aprobado')
  })

  it('No aprobado si ICC < 70', () => {
    expect(calcularResultadoConductor(69)).toBe('No aprobado')
  })

  it('null sin ICC', () => {
    expect(calcularResultadoConductor(null)).toBeNull()
  })
})

describe('calcularAlertaConductor', () => {
  const base = { diasLicencia: 100, icc: 86, estadoSalud: 'Apto' }

  it('OK cuando todo está en regla', () => {
    expect(calcularAlertaConductor(base)).toBe('OK')
  })

  it('LICENCIA_VENCIDA si la licencia ya venció', () => {
    expect(calcularAlertaConductor({ ...base, diasLicencia: -1 })).toBe('LICENCIA_VENCIDA')
  })

  it('ALERTA si la licencia vence en 30 días o menos', () => {
    expect(calcularAlertaConductor({ ...base, diasLicencia: 14 })).toBe('ALERTA')
  })

  it('ALERTA si el ICC es menor a 70', () => {
    expect(calcularAlertaConductor({ ...base, icc: 65 })).toBe('ALERTA')
  })

  it('ALERTA si el estado de salud es No apto', () => {
    expect(calcularAlertaConductor({ ...base, estadoSalud: 'No apto' })).toBe('ALERTA')
  })

  it('LICENCIA_VENCIDA tiene prioridad sobre ALERTA', () => {
    expect(calcularAlertaConductor({ ...base, diasLicencia: -1, icc: 40 })).toBe('LICENCIA_VENCIDA')
  })
})

describe('calcularCumplimientoPesv', () => {
  it('retorna null sin pasos', () => {
    expect(calcularCumplimientoPesv([])).toBeNull()
  })

  it('promedia el % de avance de los pasos con dato', () => {
    expect(calcularCumplimientoPesv([100, 100, 70, 60, 0])).toBe(66)
  })
})
