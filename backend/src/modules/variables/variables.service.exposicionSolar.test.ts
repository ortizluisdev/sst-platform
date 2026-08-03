import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Mismo patrón de mocking que variables.service.uploadVariables.test.ts — ver
// el comentario ahí sobre por qué hay que mockear estos 3 módulos completos.
const createUploadTransactionMock = vi.fn(async (_input: unknown) => ({ id: 'upload-1' }))

const TER_DEFINITIONS = [
  { id: 'def-ter-01', codigo: 'TER-01', nombre: 'Temperatura de bulbo seco', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-02', codigo: 'TER-02', nombre: 'Humedad relativa', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '%' },
  { id: 'def-ter-03', codigo: 'TER-03', nombre: 'WBGT', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 30, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-04', codigo: 'TER-04', nombre: 'PMV', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '' },
  { id: 'def-ter-05', codigo: 'TER-05', nombre: 'Temperatura de globo', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-06', codigo: 'TER-06', nombre: 'Temperatura de bulbo húmedo natural', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-07', codigo: 'TER-07', nombre: 'Temperatura radiante media', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-08', codigo: 'TER-08', nombre: 'Velocidad del aire', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'm/s' },
  { id: 'def-ter-09', codigo: 'TER-09', nombre: 'PPD', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 100, toleranciaAlerta: 0.1, unidadMedida: '%' },
  { id: 'def-ter-10', codigo: 'TER-10', nombre: 'Metabolismo', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'W/m²' },
  { id: 'def-ter-11', codigo: 'TER-11', nombre: 'Aislamiento de la ropa', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'clo' },
  { id: 'def-ter-13', codigo: 'TER-13', nombre: 'Tiempo de trabajo permitido', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'min' },
  { id: 'def-ter-14', codigo: 'TER-14', nombre: 'Tiempo de descanso requerido', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'min' },
]

vi.mock('./variables.repository.js', () => ({
  createVariablesRepository: () => ({
    findOrganizationById: async () => ({ id: 'org-1', nombre: 'Empresa Test' }),
    findServiceBySlug: async () => ({ id: 'service-1', nombre: 'Higiene Industrial', slug: 'higiene-industrial' }),
    findOrganizationService: async () => ({ isActive: true }),
    findZonaById: async () => ({ id: 'zona-1' }),
    findSeccionById: async () => ({ id: 'seccion-1' }),
    findCargoById: async () => ({ id: 'cargo-1' }),
    findTrabajadorById: async () => ({ id: 'trabajador-1' }),
    findDefinitionsByService: async () => TER_DEFINITIONS,
    createUploadTransaction: createUploadTransactionMock,
    findDisabledCategoryLabels: async () => new Set<string>(),
    createAuditLog: async () => {},
    findReadingsForUpload: async () => [],
  }),
}))

vi.mock('../notifications/notifications.service.js', () => ({
  createNotificationService: () => ({ notify: vi.fn(async () => []) }),
}))

vi.mock('../nonConformities/nonConformities.service.js', () => ({
  createNonConformitiesService: () => ({ syncForReading: vi.fn(async () => {}) }),
}))

const { createVariablesService } = await import('./variables.service.js')

function buildCsv(rows: string[]): Buffer {
  const header = 'codigo_puesto,nombre_puesto,area_planta,proceso_actividad,jornada,codigo_variable,valor'
  return Buffer.from([header, ...rows].join('\n'), 'utf-8')
}

describe('uploadVariables — motor de cálculo de Estrés Térmico conectado a exposicionSolar', () => {
  it('interior (exposicionSolar=false): calcula TER-03/04/07/09/13/14 a partir de las MEDICION/INSPECCION, ignorando cualquier valor del archivo para esos códigos', async () => {
    createUploadTransactionMock.mockClear()
    const service = createVariablesService({} as PrismaClient)

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-01,28',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-02,60',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-05,28',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-06,22',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-08,0.2',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-10,150',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-11,0.5',
      // Valor "de archivo" para TER-03 — el motor debe IGNORARLO y reemplazarlo.
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-03,999',
    ])

    await service.uploadVariables({
      organizationId: 'org-1',
      serviceSlug: 'higiene-industrial',
      uploadedById: 'user-1',
      fechaEvaluacion: new Date(Date.UTC(2026, 7, 1)),
      zonaId: 'zona-1',
      seccionId: 'seccion-1',
      cargoId: 'cargo-1',
      trabajadorId: 'trabajador-1',
      exposicionSolar: false,
      fileBuffer: csv,
      filename: 'carga.csv',
    })

    expect(createUploadTransactionMock).toHaveBeenCalledTimes(1)
    const [callInput] = createUploadTransactionMock.mock.calls[0] as [{ rows: { codigoVariable: string; valor: number }[] }]

    const wbgtRow = callInput.rows.find((r) => r.codigoVariable === 'TER-03')
    expect(wbgtRow).toBeDefined()
    // Interior: WBGT = 0.7*Tnw + 0.3*Tg = 0.7*22 + 0.3*28 = 23.8 — nunca 999.
    expect(wbgtRow!.valor).toBeCloseTo(23.8, 10)

    for (const codigo of ['TER-04', 'TER-07', 'TER-09', 'TER-13', 'TER-14']) {
      expect(callInput.rows.some((r) => r.codigoVariable === codigo)).toBe(true)
    }
  })

  it('exterior (exposicionSolar=true): usa la fórmula de WBGT exterior (0.7*Tnw + 0.2*Tg + 0.1*Ta)', async () => {
    createUploadTransactionMock.mockClear()
    const service = createVariablesService({} as PrismaClient)

    const csv = buildCsv([
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-01,30',
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-02,55',
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-05,32',
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-06,24',
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-08,0.3',
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-10,200',
      'P2,Puesto 2,Patio,Carga y descarga,DIURNA,TER-11,0.5',
    ])

    await service.uploadVariables({
      organizationId: 'org-1',
      serviceSlug: 'higiene-industrial',
      uploadedById: 'user-1',
      fechaEvaluacion: new Date(Date.UTC(2026, 7, 1)),
      zonaId: 'zona-1',
      seccionId: 'seccion-1',
      cargoId: 'cargo-1',
      trabajadorId: 'trabajador-1',
      exposicionSolar: true,
      fileBuffer: csv,
      filename: 'carga.csv',
    })

    const [callInput] = createUploadTransactionMock.mock.calls[0] as [{ rows: { codigoVariable: string; valor: number }[] }]
    const wbgtRow = callInput.rows.find((r) => r.codigoVariable === 'TER-03')
    // Exterior: WBGT = 0.7*24 + 0.2*32 + 0.1*30 = 16.8 + 6.4 + 3 = 26.2
    expect(wbgtRow!.valor).toBeCloseTo(26.2, 10)
  })

  it('exposicionSolar viaja intacto a createUploadTransaction, para persistirse en el WorkPoint', async () => {
    createUploadTransactionMock.mockClear()
    const service = createVariablesService({} as PrismaClient)

    const csv = buildCsv(['P3,Puesto 3,Bodega,Empaque,DIURNA,TER-01,25'])

    await service.uploadVariables({
      organizationId: 'org-1',
      serviceSlug: 'higiene-industrial',
      uploadedById: 'user-1',
      fechaEvaluacion: new Date(Date.UTC(2026, 7, 1)),
      zonaId: 'zona-1',
      seccionId: 'seccion-1',
      cargoId: 'cargo-1',
      trabajadorId: 'trabajador-1',
      exposicionSolar: true,
      fileBuffer: csv,
      filename: 'carga.csv',
    })

    const [callInput] = createUploadTransactionMock.mock.calls[0] as [{ exposicionSolar: boolean }]
    expect(callInput.exposicionSolar).toBe(true)
  })
})
