import { describe, it, expect, vi } from 'vitest'
import ExcelJS from 'exceljs'
import type { PrismaClient } from '@prisma/client'

// Mismo patrón de mocking que los otros tests de variables.service — ver
// variables.service.uploadVariables.test.ts para el porqué de mockear estos
// 3 módulos completos en vez de una base de datos real.
const createUploadTransactionMock = vi.fn(async (_input: unknown) => ({ id: 'upload-1' }))
let disabledCategoryLabels = new Set<string>()

const TER_DEFINITIONS = [
  { id: 'def-ter-01', codigo: 'TER-01', categoria: 'Estrés Térmico', nombre: 'Temperatura de bulbo seco', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-02', codigo: 'TER-02', categoria: 'Estrés Térmico', nombre: 'Humedad relativa', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '%' },
  { id: 'def-ter-03', codigo: 'TER-03', categoria: 'Estrés Térmico', nombre: 'WBGT', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 30, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-04', codigo: 'TER-04', categoria: 'Estrés Térmico', nombre: 'PMV', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '' },
  { id: 'def-ter-05', codigo: 'TER-05', categoria: 'Estrés Térmico', nombre: 'Temperatura de globo', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-06', codigo: 'TER-06', categoria: 'Estrés Térmico', nombre: 'Temperatura de bulbo húmedo natural', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-07', codigo: 'TER-07', categoria: 'Estrés Térmico', nombre: 'Temperatura radiante media', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: '°C' },
  { id: 'def-ter-08', codigo: 'TER-08', categoria: 'Estrés Térmico', nombre: 'Velocidad del aire', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'm/s' },
  { id: 'def-ter-09', codigo: 'TER-09', categoria: 'Estrés Térmico', nombre: 'PPD', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 100, toleranciaAlerta: 0.1, unidadMedida: '%' },
  { id: 'def-ter-10', codigo: 'TER-10', categoria: 'Estrés Térmico', nombre: 'Metabolismo', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'W/m²' },
  { id: 'def-ter-11', codigo: 'TER-11', categoria: 'Estrés Térmico', nombre: 'Aislamiento de la ropa', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'clo' },
  { id: 'def-ter-13', codigo: 'TER-13', categoria: 'Estrés Térmico', nombre: 'Tiempo de trabajo permitido', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'min' },
  { id: 'def-ter-14', codigo: 'TER-14', categoria: 'Estrés Térmico', nombre: 'Tiempo de descanso requerido', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'min' },
]

const RUV_CODIGOS = ['RUV-01', 'RUV-02', 'RUV-03', 'RUV-04', 'RUV-06', 'RUV-07', 'RUV-08']
const RUV_DEFINITIONS = RUV_CODIGOS.map((codigo, i) => ({
  id: `def-${codigo}`,
  codigo,
  categoria: 'Radiación UV',
  nombre: `Variable UV ${i + 1}`,
  comparisonType: 'RANGE',
  limiteMin: null,
  limiteMax: null,
  toleranciaAlerta: 0.1,
  unidadMedida: 'W/m²',
}))

const ILU_DEFINITIONS = [
  {
    id: 'def-ilu-01',
    codigo: 'ILU-01',
    categoria: 'Iluminación',
    nombre: 'Iluminancia horizontal media',
    comparisonType: 'MIN_LIMIT',
    limiteMin: 300,
    limiteMax: null,
    toleranciaAlerta: 0.1,
    unidadMedida: 'lux',
  },
]

const ALL_DEFINITIONS = [...TER_DEFINITIONS, ...RUV_DEFINITIONS, ...ILU_DEFINITIONS]

vi.mock('./variables.repository.js', () => ({
  createVariablesRepository: () => ({
    findOrganizationById: async () => ({ id: 'org-1', nombre: 'Empresa Test' }),
    findServiceBySlug: async () => ({ id: 'service-1', nombre: 'Higiene Industrial', slug: 'higiene-industrial' }),
    findOrganizationService: async () => ({ isActive: true }),
    findZonaById: async () => ({ id: 'zona-1' }),
    findSeccionById: async () => ({ id: 'seccion-1' }),
    findCargoById: async () => ({ id: 'cargo-1' }),
    findTrabajadorById: async () => ({ id: 'trabajador-1' }),
    findDefinitionsByService: async () => ALL_DEFINITIONS,
    findDisabledCategoryLabels: async () => disabledCategoryLabels,
    createUploadTransaction: createUploadTransactionMock,
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

async function buildReportWorkbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const hoja2 = workbook.addWorksheet('Reporte Hoja 2')
  hoja2.addRow(['Iluminación'])
  hoja2.addRow(['Variable', 'Símbolo', 'Resultado', 'Norma', 'Estado'])
  hoja2.addRow(['Iluminancia horizontal media', '', 480])
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer as ArrayBuffer)
}

describe('uploadVariables — catálogo de variables por categoría, configurable por cliente', () => {
  it('Estrés Térmico deshabilitado: no calcula ni guarda NINGUNA variable de esa categoría, aunque el archivo traiga Ta/Tg/Tnw/etc.', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set(['Estrés Térmico'])
    const service = createVariablesService({} as PrismaClient)

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-01,28',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-02,60',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-05,28',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-06,22',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-08,0.2',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-10,150',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,TER-11,0.5',
      'P1,Puesto 1,Planta A,Soldadura,DIURNA,ILU-01,320',
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
    const [callInput] = createUploadTransactionMock.mock.calls[0] as [{ rows: { codigoVariable: string }[] }]

    expect(callInput.rows.some((r) => r.codigoVariable.startsWith('TER-'))).toBe(false)
    // La categoría no relacionada (Iluminación) sigue funcionando normal.
    expect(callInput.rows.some((r) => r.codigoVariable === 'ILU-01')).toBe(true)
  })

  it('Radiación UV deshabilitada: no genera missingVariables para esos 7 códigos', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set(['Radiación UV'])
    const service = createVariablesService({} as PrismaClient)

    const fileBuffer = await buildReportWorkbookBuffer()

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
      fileBuffer,
      filename: 'reporte.xlsx',
    })

    const [callInput] = createUploadTransactionMock.mock.calls[0] as [
      { missingVariables: { codigo: string }[] | null },
    ]
    const faltantesUv = (callInput.missingVariables ?? []).filter((m) => m.codigo.startsWith('RUV-'))
    expect(faltantesUv).toEqual([])
  })

  it('control — Radiación UV habilitada (default): sí genera missingVariables para esos códigos', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set()
    const service = createVariablesService({} as PrismaClient)

    const fileBuffer = await buildReportWorkbookBuffer()

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
      fileBuffer,
      filename: 'reporte.xlsx',
    })

    const [callInput] = createUploadTransactionMock.mock.calls[0] as [
      { missingVariables: { codigo: string }[] | null },
    ]
    const faltantesUv = (callInput.missingVariables ?? []).filter((m) => m.codigo.startsWith('RUV-'))
    expect(faltantesUv.length).toBe(RUV_CODIGOS.length)
  })
})
