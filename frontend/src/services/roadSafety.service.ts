import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type {
  RoadSafetyUploadRecord,
  RoadSafetyHoja1Data,
  RoadSafetyVehiculo,
  RoadSafetyConductor,
  RoadSafetyRuta,
  RoadSafetyAlertasPanel,
  RoadSafetyReportMetadata,
  RoadSafetyReportTipo,
} from '@/types/roadSafety'

export class RoadSafetyRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RoadSafetyRequestError'
    this.status = status
  }
}

async function rethrow(err: unknown): Promise<never> {
  if (isAxiosError(err) && err.response) {
    let message = 'Ocurrió un error'
    const data = err.response.data
    try {
      const text = data instanceof Blob ? await data.text() : JSON.stringify(data)
      const parsed = JSON.parse(text)
      message = parsed.message ?? Object.values(parsed.errors ?? {})[0] ?? message
    } catch {
      // Cuerpo no-JSON — se queda con el mensaje genérico.
    }
    throw new RoadSafetyRequestError(err.response.status, message)
  }
  throw err
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

interface RoadSafetyScope {
  /** Presente solo en uso admin — el cliente nunca lo pasa (org derivada de
   * la sesión en el backend), mismo patrón que reports.service.ts. */
  organizationId?: string
}

function basePath(scope: RoadSafetyScope): string {
  return scope.organizationId ? `/admin/organizations/${scope.organizationId}/road-safety` : '/road-safety'
}

export async function uploadRoadSafetyWorkbook(scope: RoadSafetyScope, file: File): Promise<RoadSafetyUploadRecord> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post(`${basePath(scope)}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.upload
  } catch (err) {
    return rethrow(err)
  }
}

export async function getRoadSafetyUploadHistory(scope: RoadSafetyScope): Promise<RoadSafetyUploadRecord[]> {
  try {
    const { data } = await apiClient.get(`${basePath(scope)}/uploads`)
    return data.uploads
  } catch (err) {
    return rethrow(err)
  }
}

export async function getRoadSafetyHoja1(scope: RoadSafetyScope): Promise<RoadSafetyHoja1Data> {
  try {
    const { data } = await apiClient.get(`${basePath(scope)}/hoja1`)
    return data
  } catch (err) {
    return rethrow(err)
  }
}

export async function getRoadSafetyHoja2(scope: RoadSafetyScope): Promise<RoadSafetyVehiculo[]> {
  try {
    const { data } = await apiClient.get(`${basePath(scope)}/hoja2`)
    return data.vehiculos
  } catch (err) {
    return rethrow(err)
  }
}

export async function getRoadSafetyHoja3(scope: RoadSafetyScope): Promise<RoadSafetyConductor[]> {
  try {
    const { data } = await apiClient.get(`${basePath(scope)}/hoja3`)
    return data.conductores
  } catch (err) {
    return rethrow(err)
  }
}

export async function getRoadSafetyHoja4(scope: RoadSafetyScope): Promise<RoadSafetyRuta[]> {
  try {
    const { data } = await apiClient.get(`${basePath(scope)}/hoja4`)
    return data.rutas
  } catch (err) {
    return rethrow(err)
  }
}

export async function getRoadSafetyAlertas(scope: RoadSafetyScope): Promise<RoadSafetyAlertasPanel> {
  try {
    const { data } = await apiClient.get(`${basePath(scope)}/alertas`)
    return data
  } catch (err) {
    return rethrow(err)
  }
}

export type RoadSafetyFieldValue = string | number | boolean | null

/** Corrección puntual por celda (admin) — organizationId siempre presente
 * acá (nunca se llama en contexto cliente, que no tiene permiso ni UI para
 * esto). */
export async function correctRoadSafetyVehiculoField(
  organizationId: string,
  vehiculoId: string,
  field: string,
  value: RoadSafetyFieldValue,
  reason: string,
): Promise<RoadSafetyVehiculo> {
  try {
    const { data } = await apiClient.patch(
      `/admin/organizations/${organizationId}/road-safety/hoja2/vehiculos/${vehiculoId}`,
      { field, value, reason },
    )
    return data
  } catch (err) {
    return rethrow(err)
  }
}

export async function correctRoadSafetyConductorField(
  organizationId: string,
  conductorId: string,
  field: string,
  value: RoadSafetyFieldValue,
  reason: string,
): Promise<RoadSafetyConductor> {
  try {
    const { data } = await apiClient.patch(
      `/admin/organizations/${organizationId}/road-safety/hoja3/conductores/${conductorId}`,
      { field, value, reason },
    )
    return data
  } catch (err) {
    return rethrow(err)
  }
}

export async function generateRoadSafetyReportPdf(
  scope: RoadSafetyScope,
  tipo: RoadSafetyReportTipo,
  metadata: RoadSafetyReportMetadata,
): Promise<void> {
  try {
    const response = await apiClient.post(
      `${basePath(scope)}/reports/pdf`,
      { tipo, metadata },
      { responseType: 'blob' },
    )
    downloadBlob(response.data, `reporte-seguridad-vial-${tipo}.pdf`)
  } catch (err) {
    await rethrow(err)
  }
}

export async function generateRoadSafetyReportCsv(scope: RoadSafetyScope, tipo: RoadSafetyReportTipo): Promise<void> {
  try {
    const response = await apiClient.post(`${basePath(scope)}/reports/csv`, { tipo }, { responseType: 'blob' })
    downloadBlob(response.data, `reporte-seguridad-vial-${tipo}.csv`)
  } catch (err) {
    await rethrow(err)
  }
}
