import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { DashboardData, DashboardFilters, OrganizationOption, UploadHistoryEntry, UploadDetail } from '@/types/dashboard'
import type { ServiceOption } from '@/types/organization'

export class DashboardRequestError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'DashboardRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    throw new DashboardRequestError(status, data.message ?? 'Ocurrió un error', data.errors)
  }
  throw err
}

/** Cliente: servicios contratados de su propia organización — para el
 * selector del sidebar cuando tiene más de uno. */
export async function listMyContractedServices(): Promise<ServiceOption[]> {
  try {
    const { data } = await apiClient.get('/dashboard/services')
    return data.services
  } catch (err) {
    rethrow(err)
  }
}

/** Cliente: siempre su propia organización (derivada de la sesión en el backend).
 * `filters` es opcional y aditivo (ver getDashboard en el backend): sin
 * filtros, el comportamiento es idéntico al de siempre (última carga). */
export async function getClientDashboard(serviceSlug: string, filters?: DashboardFilters): Promise<DashboardData> {
  try {
    const { data } = await apiClient.get(`/dashboard/${serviceSlug}`, { params: filters })
    return data
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: cualquier organización, explícita en la ruta. */
export async function getAdminDashboard(
  organizationId: string,
  serviceSlug: string,
  filters?: DashboardFilters,
): Promise<DashboardData> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/dashboard/${serviceSlug}`, { params: filters })
    return data
  } catch (err) {
    rethrow(err)
  }
}

export async function listOrganizations(serviceSlug: string): Promise<OrganizationOption[]> {
  try {
    const { data } = await apiClient.get('/admin/organizations', { params: { serviceSlug } })
    return data.organizations
  } catch (err) {
    rethrow(err)
  }
}


/** Cliente: historial de cargas de su propia organización. */
export async function getClientUploadHistory(serviceSlug: string): Promise<UploadHistoryEntry[]> {
  try {
    const { data } = await apiClient.get(`/dashboard/${serviceSlug}/uploads`)
    return data.uploads
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: historial de cargas de cualquier organización. */
export async function getAdminUploadHistory(organizationId: string, serviceSlug: string): Promise<UploadHistoryEntry[]> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/dashboard/${serviceSlug}/uploads`)
    return data.uploads
  } catch (err) {
    rethrow(err)
  }
}

export async function getClientUploadDetail(serviceSlug: string, uploadId: string): Promise<UploadDetail> {
  try {
    const { data } = await apiClient.get(`/dashboard/${serviceSlug}/uploads/${uploadId}`)
    return data
  } catch (err) {
    rethrow(err)
  }
}

export async function getAdminUploadDetail(
  organizationId: string,
  serviceSlug: string,
  uploadId: string,
): Promise<UploadDetail> {
  try {
    const { data } = await apiClient.get(
      `/admin/organizations/${organizationId}/dashboard/${serviceSlug}/uploads/${uploadId}`,
    )
    return data
  } catch (err) {
    rethrow(err)
  }
}

export interface UploadResult {
  uploadId: string
  filasProcesadas: number
  puestosAfectados: number
  filasOmitidas?: (
    | { workPointCodigo: string; codigoVariable: string }
    | { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' }
  )[]
}

export async function uploadVariablesFile(input: {
  organizationId: string
  serviceSlug: string
  file: File
  fechaEvaluacion: string
}): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', input.file)
  formData.append('fechaEvaluacion', input.fechaEvaluacion)

  try {
    const { data } = await apiClient.post(
      `/admin/organizations/${input.organizationId}/services/${input.serviceSlug}/variables/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: corrige el valor de una lectura ya procesada. El backend
 * recalcula el semáforo — nunca se envía desde el frontend. */
export async function correctReading(
  organizationId: string,
  serviceSlug: string,
  readingId: string,
  valor: number,
  reason: string,
): Promise<void> {
  try {
    await apiClient.patch(
      `/admin/organizations/${organizationId}/services/${serviceSlug}/readings/${readingId}`,
      { valor, reason },
    )
  } catch (err) {
    rethrow(err)
  }
}
