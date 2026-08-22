import { describe, expect, it } from 'vitest'
import { buildRoadSafetyAlerts } from './roadSafetyAlerts'
import type { RoadSafetyVehiculo, RoadSafetyConductor } from '@/types/roadSafety'

// Fake `t`: devuelve la clave sola, o "clave:{...params}" si hay params —
// suficiente para verificar QUÉ clave se llamó y con qué datos, sin
// depender del texto final traducido (eso lo cubre clientSheets.config.test.ts
// para otras claves, y aquí no aporta nada probar contra texto en español).
function fakeT(key: string, params?: Record<string, unknown>): string {
  return params ? `${key}:${JSON.stringify(params)}` : key
}

function vehiculo(overrides: Partial<RoadSafetyVehiculo>): RoadSafetyVehiculo {
  return {
    id: '1',
    placa: 'ABC123',
    tipo: null,
    marcaLinea: null,
    modeloAnio: null,
    ciudad: null,
    zona: null,
    sede: null,
    rutasAsignadas: null,
    conductoresAsignados: null,
    soatVence: null,
    diasSoat: null,
    rtmVence: null,
    diasRtm: null,
    polizaRcVence: null,
    tarjetaOperacionVence: null,
    comparendos: 0,
    ultMantenimiento: null,
    kmActual: null,
    kmProxMant: null,
    cambioAceite: null,
    pruebaFrenado: null,
    alineacionBalanceo: null,
    llantasLabradoMm: null,
    lucesSenales: null,
    preoperacionalUlt: null,
    consumoGalMes: null,
    rendimientoKmGal: null,
    rendimientoBaseKmGal: null,
    anomaliaConsumoPct: null,
    seguridadActiva: null,
    seguridadPasiva: null,
    gpsTelemetria: null,
    alerta: 'OK',
    correctedFields: null,
    ...overrides,
  }
}

function conductor(overrides: Partial<RoadSafetyConductor>): RoadSafetyConductor {
  return {
    id: '1',
    documento: '123',
    nombre: 'Test Conductor',
    cargo: null,
    actorVial: null,
    ciudad: null,
    sede: null,
    vehiculosAsignados: null,
    licCategoria: null,
    licenciaVence: null,
    diasLicencia: null,
    psicosensometricoVence: null,
    estadoSalud: null,
    nCursosSv: null,
    horasFormacion: null,
    ultimaCapacitacion: null,
    reentrenamientoProgramado: null,
    scoreConduccionSegura: null,
    scoreManejoDefensivo: null,
    scoreManejoComentadoDiurno: null,
    scoreManejoComentadoNocturno: null,
    scoreConocimientoVehiculo: null,
    scoreNormasTransito: null,
    scoreGestionFatiga: null,
    scoreInvestigacionSiniestros: null,
    scorePrimerosAuxilios: null,
    icc: null,
    resultado: null,
    alerta: 'OK',
    correctedFields: null,
    ...overrides,
  }
}

describe('buildRoadSafetyAlerts', () => {
  it('vehículo OK y conductor OK no generan ninguna alerta', () => {
    const result = buildRoadSafetyAlerts([vehiculo({})], [conductor({})], fakeT)
    expect(result).toEqual([])
  })

  it('vehículo VENCIDO genera alerta critical', () => {
    const result = buildRoadSafetyAlerts([vehiculo({ alerta: 'VENCIDO', diasSoat: -5 })], [], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('critical')
  })

  it('vehículo ALERTA genera alerta warning', () => {
    const result = buildRoadSafetyAlerts([vehiculo({ alerta: 'ALERTA', diasSoat: 10 })], [], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('warning')
  })

  it('conductor LICENCIA_VENCIDA genera alerta critical', () => {
    const result = buildRoadSafetyAlerts([], [conductor({ alerta: 'LICENCIA_VENCIDA', diasLicencia: -3 })], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('critical')
  })

  it('conductor ALERTA genera alerta warning', () => {
    const result = buildRoadSafetyAlerts([], [conductor({ alerta: 'ALERTA', icc: 60 })], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('warning')
  })

  it('ordena critical antes que warning', () => {
    const result = buildRoadSafetyAlerts(
      [vehiculo({ alerta: 'ALERTA', diasSoat: 10 }), vehiculo({ id: '2', placa: 'XYZ789', alerta: 'VENCIDO', diasSoat: -1 })],
      [],
      fakeT,
    )
    expect(result.map((a) => a.severity)).toEqual(['critical', 'warning'])
  })

  it('vehículo ALERTA por comparendos incluye la razón con la cantidad', () => {
    const result = buildRoadSafetyAlerts([vehiculo({ alerta: 'ALERTA', comparendos: 2 })], [], fakeT)
    expect(result[0]!.detail).toContain('"cantidad":2')
  })
})
