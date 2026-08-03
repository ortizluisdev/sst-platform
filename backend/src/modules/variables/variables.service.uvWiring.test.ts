import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Mismo patrón de mocking que los demás tests de variables.service — ver
// variables.service.uploadVariables.test.ts para el porqué.
const createUploadTransactionMock = vi.fn(async (_input: unknown) => ({ id: 'upload-1' }))

const RUV_DEFINITIONS = [
  { id: 'def-ruv-01', codigo: 'RUV-01', categoria: 'Radiación UV', nombre: 'Índice UV', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 3, toleranciaAlerta: 0.1, unidadMedida: 'UV Index' },
  { id: 'def-ruv-02', codigo: 'RUV-02', categoria: 'Radiación UV', nombre: 'Irradiancia efectiva', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'W/m²' },
  { id: 'def-ruv-03', codigo: 'RUV-03', categoria: 'Radiación UV', nombre: 'Exposición radiante efectiva', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 30, toleranciaAlerta: 0.1, unidadMedida: 'J/m²' },
  { id: 'def-ruv-04', codigo: 'RUV-04', categoria: 'Radiación UV', nombre: 'Tiempo máximo de exposición', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'h' },
]

let disabledCategoryLabels = new Set<string>()

vi.mock('./variables.repository.js', () => ({
  createVariablesRepository: () => ({
    findOrganizationById: async () => ({ id: 'org-1', nombre: 'Empresa Test' }),
    findServiceBySlug: async () => ({ id: 'service-1', nombre: 'Higiene Industrial', slug: 'higiene-industrial' }),
    findOrganizationService: async () => ({ isActive: true }),
    findZonaById: async () => ({ id: 'zona-1' }),
    findSeccionById: async () => ({ id: 'seccion-1' }),
    findCargoById: async () => ({ id: 'cargo-1' }),
    findTrabajadorById: async () => ({ id: 'trabajador-1' }),
    findDefinitionsByService: async () => RUV_DEFINITIONS,
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

async function upload(csv: Buffer) {
  const service = createVariablesService({} as PrismaClient)
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
  const [callInput] = createUploadTransactionMock.mock.calls[0] as [
    {
      rows: { codigoVariable: string; valor: number }[]
      omittedRows: { nombre: string; motivo: string }[] | null
    },
  ]
  return callInput
}

describe('uploadVariables — motor de cálculo de Radiación UV conectado (RUV-03/RUV-04)', () => {
  it('calcula Heff y tiempo máximo a partir de RUV-02 + jornada (DIURNA=8h), ignorando cualquier valor del archivo para esos 2 códigos', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set()

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,RUV-02,0.4',
      // Valores "de archivo" — el motor debe IGNORARLOS y reemplazarlos.
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,RUV-03,999',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,RUV-04,999',
    ])

    const callInput = await upload(csv)

    const ruv03 = callInput.rows.find((r) => r.codigoVariable === 'RUV-03')
    const ruv04 = callInput.rows.find((r) => r.codigoVariable === 'RUV-04')

    // Heff = 0.4 × 28800 = 11520 J/m²
    expect(ruv03!.valor).toBeCloseTo(11520, 6)
    // t_max = 30/0.4 = 75s = 0.02083...h
    expect(ruv04!.valor).toBeCloseTo(75 / 3600, 8)
  })

  it('jornada NOCTURNA también se resuelve a 8h (mismo criterio confirmado por el cliente)', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set()

    const csv = buildCsv(['P1,Puesto 1,Planta A,Proceso A,NOCTURNA,RUV-02,0.4'])

    const callInput = await upload(csv)
    const ruv03 = callInput.rows.find((r) => r.codigoVariable === 'RUV-03')
    expect(ruv03!.valor).toBeCloseTo(11520, 6)
  })

  it('falta RUV-02: ni RUV-03 ni RUV-04 se calculan, quedan omitidos con motivo explícito', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set()

    // Fila "ancla" para que el puesto exista sin traer RUV-02 — usamos un
    // código RUV distinto de los CALCULO (RUV-03/RUV-04 se filtran siempre,
    // sea cual sea su origen) para no interferir con el filtro.
    const csv = buildCsv(['P1,Puesto 1,Planta A,Proceso A,DIURNA,RUV-01,2.5'])

    const callInput = await upload(csv)

    expect(callInput.rows.some((r) => r.codigoVariable === 'RUV-03')).toBe(false)
    expect(callInput.rows.some((r) => r.codigoVariable === 'RUV-04')).toBe(false)
    const motivos = (callInput.omittedRows ?? []).map((o) => o.nombre)
    expect(motivos.some((m) => m.includes('RUV-03') && m.includes('no calculable: falta Eeff'))).toBe(true)
    expect(motivos.some((m) => m.includes('RUV-04') && m.includes('no calculable: falta Eeff'))).toBe(true)
  })

  it('Radiación UV deshabilitada para la organización: no calcula ninguna de las 2 variables', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set(['Radiación UV'])

    const csv = buildCsv(['P1,Puesto 1,Planta A,Proceso A,DIURNA,RUV-02,0.4'])

    await expect(upload(csv)).rejects.toMatchObject({ code: 'UNKNOWN_VARIABLES' })
    expect(createUploadTransactionMock).not.toHaveBeenCalled()
  })
})
