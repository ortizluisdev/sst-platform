import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Mismo patrón de mocking que los demás tests de variables.service — ver
// variables.service.uploadVariables.test.ts para el porqué.
const createUploadTransactionMock = vi.fn(async (_input: unknown) => ({ id: 'upload-1' }))

const RUI_DEFINITIONS = [
  { id: 'def-rui-03', codigo: 'RUI-03', categoria: 'Sonido', nombre: 'Tiempo de exposición', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 8, toleranciaAlerta: 0.1, unidadMedida: 'h' },
  { id: 'def-rui-04', codigo: 'RUI-04', categoria: 'Sonido', nombre: 'Dosis de ruido', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 100, toleranciaAlerta: 0.1, unidadMedida: '%' },
  { id: 'def-rui-05', codigo: 'RUI-05', categoria: 'Sonido', nombre: 'Nivel continuo equivalente (A)', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 85, toleranciaAlerta: 0.1, unidadMedida: 'dB(A)' },
  { id: 'def-rui-06', codigo: 'RUI-06', categoria: 'Sonido', nombre: 'Nivel de exposición diaria', comparisonType: 'MAX_LIMIT', limiteMin: null, limiteMax: 85, toleranciaAlerta: 0.1, unidadMedida: 'dB(A)' },
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
    findDefinitionsByService: async () => RUI_DEFINITIONS,
    findDisabledCategoryLabels: async () => new Set<string>(),
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

describe('uploadVariables — Sonido con inputs incompletos (Sonido habilitado, pero falta t o LAeq)', () => {
  it('falta t (RUI-03): ni RUI-06 ni RUI-04 se calculan, y ambos quedan reportados como omitidos con el motivo explícito', async () => {
    createUploadTransactionMock.mockClear()
    const service = createVariablesService({} as PrismaClient)

    const csv = buildCsv(['P1,Puesto 1,Planta A,Proceso A,DIURNA,RUI-05,82.4'])

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
      { rows: { codigoVariable: string }[]; omittedRows: { nombre: string; motivo: string }[] | null },
    ]

    expect(callInput.rows.some((r) => r.codigoVariable === 'RUI-06')).toBe(false)
    expect(callInput.rows.some((r) => r.codigoVariable === 'RUI-04')).toBe(false)
    const motivos = (callInput.omittedRows ?? []).map((o) => o.nombre)
    expect(motivos.some((m) => m.includes('RUI-06') && m.includes('no calculable: falta t'))).toBe(true)
    expect(motivos.some((m) => m.includes('RUI-04') && m.includes('no calculable: falta LEX,8h'))).toBe(true)
  })

  it('falta LAeq (RUI-05): mismo resultado — ninguno de los 2 se calcula', async () => {
    createUploadTransactionMock.mockClear()
    const service = createVariablesService({} as PrismaClient)

    const csv = buildCsv(['P1,Puesto 1,Planta A,Proceso A,DIURNA,RUI-03,6.2'])

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
      { rows: { codigoVariable: string }[]; omittedRows: { nombre: string; motivo: string }[] | null },
    ]

    expect(callInput.rows.some((r) => r.codigoVariable === 'RUI-06')).toBe(false)
    expect(callInput.rows.some((r) => r.codigoVariable === 'RUI-04')).toBe(false)
    const motivos = (callInput.omittedRows ?? []).map((o) => o.nombre)
    expect(motivos.some((m) => m.includes('RUI-06') && m.includes('no calculable: falta LAeq'))).toBe(true)
  })
})
