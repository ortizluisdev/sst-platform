import { describe, it, expect, vi } from 'vitest'
import ExcelJS from 'exceljs'
import type { PrismaClient } from '@prisma/client'

// Mock del repositorio/notificaciones/no-conformidades — createVariablesService
// los instancia internamente a partir de un PrismaClient (no son inyectables
// por parámetro), así que la única forma de aislar uploadVariables() sin una
// base de datos real es reemplazar estos 3 módulos completos. `createUploadTransactionMock`
// es lo que realmente nos interesa inspeccionar: qué `fechaEvaluacion` recibió.
const createUploadTransactionMock = vi.fn(async (_input: { fechaEvaluacion: Date }) => ({ id: 'upload-1' }))

vi.mock('./variables.repository.js', () => ({
  createVariablesRepository: () => ({
    findOrganizationById: async () => ({ id: 'org-1', nombre: 'Empresa Test' }),
    findServiceBySlug: async () => ({ id: 'service-1', nombre: 'Higiene Industrial', slug: 'higiene-industrial' }),
    findOrganizationService: async () => ({ isActive: true }),
    findZonaById: async () => ({ id: 'zona-1' }),
    findSeccionById: async () => ({ id: 'seccion-1' }),
    findCargoById: async () => ({ id: 'cargo-1' }),
    findTrabajadorById: async () => ({ id: 'trabajador-1' }),
    findDefinitionsByService: async () => [
      {
        id: 'def-ilu-01',
        codigo: 'ILU-01',
        nombre: 'Iluminancia horizontal media',
        comparisonType: 'MIN_LIMIT',
        limiteMin: 300,
        limiteMax: null,
        toleranciaAlerta: 0.1,
        unidadMedida: 'lux',
      },
    ],
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

// Import DESPUÉS de los vi.mock — hoisting de vitest los aplica igual, pero
// mantenerlo así deja explícito que variables.service.js ya ve las versiones
// mockeadas al importarse.
const { createVariablesService } = await import('./variables.service.js')

/** Workbook real (buffer .xlsx, no un objeto ExcelJS en memoria) — uploadVariables
 * detecta REPORTE_EXCEL cargando el buffer con `workbookCargado.xlsx.load(...)`,
 * así que el test tiene que pasar por el mismo camino que un archivo real. */
async function buildReportWorkbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const hoja2 = workbook.addWorksheet('Reporte Hoja 2')
  hoja2.addRow(['Iluminación'])
  hoja2.addRow(['Variable', 'Símbolo', 'Resultado', 'Norma', 'Estado'])
  hoja2.addRow(['Iluminancia horizontal media', '', 480])
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer as ArrayBuffer)
}

describe('uploadVariables — Fix 1: fechaEvaluacion respeta el date-picker', () => {
  it('para REPORTE_EXCEL, persiste la fecha elegida por el admin, no la fecha de hoy', async () => {
    createUploadTransactionMock.mockClear()
    const service = createVariablesService({} as PrismaClient)

    // Fecha deliberadamente lejos de "hoy" — si el bug reapareciera (forzar
    // la fecha de la carga a la fecha del sistema), este assert lo detecta
    // sin depender de en qué día corra el test.
    const fechaElegida = new Date(Date.UTC(2020, 0, 15, 10, 30, 0))
    const fileBuffer = await buildReportWorkbookBuffer()

    await service.uploadVariables({
      organizationId: 'org-1',
      serviceSlug: 'higiene-industrial',
      uploadedById: 'user-1',
      fechaEvaluacion: fechaElegida,
      zonaId: 'zona-1',
      seccionId: 'seccion-1',
      cargoId: 'cargo-1',
      trabajadorId: 'trabajador-1',
      exposicionSolar: false,
      fileBuffer,
      filename: 'reporte.xlsx',
    })

    expect(createUploadTransactionMock).toHaveBeenCalledTimes(1)
    const [callInput] = createUploadTransactionMock.mock.calls[0]!
    expect(callInput.fechaEvaluacion).toEqual(fechaElegida)
    expect(callInput.fechaEvaluacion.toISOString().slice(0, 10)).not.toBe(new Date().toISOString().slice(0, 10))
  })
})
