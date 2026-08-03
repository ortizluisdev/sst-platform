import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Mismo patrón de mocking que los demás tests de variables.service — ver
// variables.service.uploadVariables.test.ts para el porqué.
const createUploadTransactionMock = vi.fn(async (_input: unknown) => ({ id: 'upload-1' }))

const VIB_DEFINITIONS = [
  { id: 'def-vib-04', codigo: 'VIB-04', categoria: 'Vibración', nombre: 'Tiempo de exposición', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'h' },
  { id: 'def-vib-05', codigo: 'VIB-05', categoria: 'Vibración', nombre: 'Aceleración ponderada mano-brazo', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'm/s²' },
  { id: 'def-vib-06', codigo: 'VIB-06', categoria: 'Vibración', nombre: 'Exposición diaria mano-brazo (A(8))', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 5, toleranciaAlerta: 0.1, unidadMedida: 'm/s²' },
  { id: 'def-vib-07', codigo: 'VIB-07', categoria: 'Vibración', nombre: 'Aceleración ponderada cuerpo entero', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'm/s²' },
  { id: 'def-vib-08', codigo: 'VIB-08', categoria: 'Vibración', nombre: 'Exposición diaria cuerpo entero (A(8))', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 1.15, toleranciaAlerta: 0.1, unidadMedida: 'm/s²' },
  { id: 'def-vib-09', codigo: 'VIB-09', categoria: 'Vibración', nombre: 'Valor de dosis de vibración (VDV)', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 21, toleranciaAlerta: 0.1, unidadMedida: 'm/s^1.75' },
  { id: 'def-vib-10', codigo: 'VIB-10', categoria: 'Vibración', nombre: 'Factor de cresta', comparisonType: 'RANGE', limiteMin: null, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'adimensional' },
  { id: 'def-ilu-01', codigo: 'ILU-01', categoria: 'Iluminación', nombre: 'Iluminancia horizontal media', comparisonType: 'MIN_LIMIT', limiteMin: 300, limiteMax: null, toleranciaAlerta: 0.1, unidadMedida: 'lux' },
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
    findDefinitionsByService: async () => VIB_DEFINITIONS,
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

describe('uploadVariables — motor de cálculo de Vibración conectado (VIB-06/VIB-08/VIB-09)', () => {
  it('calcula A(8) mano-brazo, A(8) cuerpo entero y VDV a partir de VIB-04/05/07/10, ignorando cualquier valor del archivo para esos 3 códigos', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set()

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-04,7',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-05,3.1',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-07,0.8',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-10,4',
      // Valor "de archivo" para VIB-09 — el motor debe IGNORARLO y reemplazarlo.
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-09,999',
    ])

    const callInput = await upload(csv)

    const vib06 = callInput.rows.find((r) => r.codigoVariable === 'VIB-06')
    const vib08 = callInput.rows.find((r) => r.codigoVariable === 'VIB-08')
    const vib09 = callInput.rows.find((r) => r.codigoVariable === 'VIB-09')

    // A(8) mano-brazo = 3.1 × √(7/8)
    expect(vib06!.valor).toBeCloseTo(3.1 * Math.sqrt(7 / 8), 6)
    // A(8) cuerpo entero = 0.8 × √(7/8)
    expect(vib08!.valor).toBeCloseTo(0.8 * Math.sqrt(7 / 8), 6)
    // VDV = 1.4 × 0.8 × 7^0.25 — nunca 999.
    expect(vib09!.valor).toBeCloseTo(1.822, 2)
  })

  it('factor de cresta ≥ 6: VIB-09 no se calcula (queda omitido con motivo "no aplica"), pero VIB-06/VIB-08 sí', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set()

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-04,7',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-05,3.1',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-07,0.8',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-10,8',
    ])

    const callInput = await upload(csv)

    expect(callInput.rows.some((r) => r.codigoVariable === 'VIB-09')).toBe(false)
    expect(callInput.rows.some((r) => r.codigoVariable === 'VIB-06')).toBe(true)
    expect(callInput.rows.some((r) => r.codigoVariable === 'VIB-08')).toBe(true)
    const motivos = (callInput.omittedRows ?? []).map((o) => o.nombre)
    expect(motivos.some((m) => m.includes('VIB-09') && m.includes('no aplica'))).toBe(true)
  })

  it('Vibración deshabilitada para la organización: no calcula ninguna de las 3 variables (aquí el catálogo mockeado es 100% Vibración, así que el resultado es "ninguna fila utilizable" — con un catálogo real mixto, las demás categorías seguirían procesándose normal)', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set(['Vibración'])

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-04,7',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-05,3.1',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-07,0.8',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-10,4',
    ])

    await expect(upload(csv)).rejects.toMatchObject({
      code: 'UNKNOWN_VARIABLES',
    })
    expect(createUploadTransactionMock).not.toHaveBeenCalled()
  })

  it('Vibración deshabilitada con catálogo mixto: ninguna variable VIB-* se guarda, pero Iluminación (categoría distinta) se procesa normal', async () => {
    createUploadTransactionMock.mockClear()
    disabledCategoryLabels = new Set(['Vibración'])

    const csv = buildCsv([
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-04,7',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-05,3.1',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-07,0.8',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,VIB-10,4',
      'P1,Puesto 1,Planta A,Proceso A,DIURNA,ILU-01,320',
    ])

    const callInput = await upload(csv)

    expect(callInput.rows.some((r) => r.codigoVariable.startsWith('VIB-'))).toBe(false)
    expect(callInput.rows.some((r) => r.codigoVariable === 'ILU-01')).toBe(true)
  })
})
