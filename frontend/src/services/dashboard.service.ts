import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type {
  DashboardData,
  DashboardFilters,
  OrganizationOption,
  UploadHistoryEntry,
  UploadDetail,
  NonConformity,
  NonConformityInput,
  NonConformityUpdateInput,
  NonConformityFilters,
  NonConformityListResult,
} from '@/types/dashboard'
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
    const { status, data } = err.response as {
      status: number
      data: { message?: string; errors?: Record<string, string> }
    }
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
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/dashboard/${serviceSlug}`, {
      params: filters,
    })
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
export async function getAdminUploadHistory(
  organizationId: string,
  serviceSlug: string,
): Promise<UploadHistoryEntry[]> {
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
  zonaId: string
  seccionId: string
  cargoId: string
  trabajadorId: string
  exposicionSolar: boolean
}): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', input.file)
  formData.append('fechaEvaluacion', input.fechaEvaluacion)
  formData.append('zonaId', input.zonaId)
  formData.append('seccionId', input.seccionId)
  formData.append('cargoId', input.cargoId)
  formData.append('trabajadorId', input.trabajadorId)
  formData.append('exposicionSolar', String(input.exposicionSolar))

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
    await apiClient.patch(`/admin/organizations/${organizationId}/services/${serviceSlug}/readings/${readingId}`, {
      valor,
      reason,
    })
  } catch (err) {
    rethrow(err)
  }
}

export type HigieneCategoria = 'ESTRES_TERMICO' | 'ILUMINACION' | 'SONIDO' | 'RADIACION_UV' | 'VIBRACION'

export interface HeatmapImage {
  id: string
  categoria: HigieneCategoria
  zonaId: string
  zonaNombre: string
  imageBase64: string
  updatedAt: string
}

/** Cliente: mapas de calor de riesgo vigentes para su propia empresa — una
 * imagen por combinación categoría+zona, subida por el admin (no calculada,
 * ver decisión en la spec de "tendencia de riesgo"). */
export async function getClientHeatmap(serviceSlug: string): Promise<HeatmapImage[]> {
  try {
    const { data } = await apiClient.get(`/dashboard/${serviceSlug}/heatmap`)
    return data.images
  } catch (err) {
    rethrow(err)
  }
}

export async function getAdminHeatmap(organizationId: string, serviceSlug: string): Promise<HeatmapImage[]> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/dashboard/${serviceSlug}/heatmap`)
    return data.images
  } catch (err) {
    rethrow(err)
  }
}

/** Admin: sube/reemplaza la imagen de mapa de calor de una combinación
 * empresa+servicio+categoría+zona. */
export async function saveHeatmap(
  organizationId: string,
  serviceSlug: string,
  input: { categoria: HigieneCategoria; zonaId: string; imageBase64: string },
): Promise<void> {
  try {
    await apiClient.patch(`/admin/organizations/${organizationId}/dashboard/${serviceSlug}/heatmap`, input)
  } catch (err) {
    rethrow(err)
  }
}

export async function getClientNonConformities(serviceSlug: string): Promise<NonConformity[]> {
  try {
    const { data } = await apiClient.get(`/dashboard/${serviceSlug}/non-conformities`)
    return data.items
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: listado paginado con filtros — alimenta tanto la pestaña
 * dedicada (paginación completa) como el resumen "más importantes" de
 * Hoja 1 · Dashboard (pageSize chico + sort:'prioridad'). */
export async function getAdminNonConformitiesPaginated(
  organizationId: string,
  serviceSlug: string,
  filters: NonConformityFilters = {},
): Promise<NonConformityListResult> {
  try {
    const { data } = await apiClient.get(
      `/admin/organizations/${organizationId}/dashboard/${serviceSlug}/non-conformities`,
      { params: filters },
    )
    return data
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: borrado suave (ver comentario de `deletedAt` en
 * schema.prisma) — nunca elimina la fila realmente. */
export async function deleteNonConformity(organizationId: string, serviceSlug: string, id: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/organizations/${organizationId}/dashboard/${serviceSlug}/non-conformities/${id}`)
  } catch (err) {
    rethrow(err)
  }
}

export interface NonConformityVariableOption {
  id: string
  codigo: string
  nombre: string
  categoria: HigieneCategoria | null
}

/** Super-admin: catálogo de variables para el selector del formulario de
 * creación manual — ya filtrado por categorías habilitadas de la
 * organización (antes era un campo de texto libre, sin relación con el
 * catálogo). */
export async function getNonConformityVariableOptions(
  organizationId: string,
  serviceSlug: string,
): Promise<NonConformityVariableOption[]> {
  try {
    const { data } = await apiClient.get(
      `/admin/organizations/${organizationId}/dashboard/${serviceSlug}/non-conformities/variable-options`,
    )
    return data.items
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: redacta una no conformidad manual (además de las que el
 * sistema genera automáticamente por lecturas fuera de norma). */
export async function createNonConformity(
  organizationId: string,
  serviceSlug: string,
  input: NonConformityInput,
): Promise<NonConformity> {
  try {
    const { data } = await apiClient.post(
      `/admin/organizations/${organizationId}/dashboard/${serviceSlug}/non-conformities`,
      input,
    )
    return data
  } catch (err) {
    rethrow(err)
  }
}

/** Super-admin: edita descripción/prioridad/estado de cualquier no conformidad
 * (automática o manual). */
export async function updateNonConformity(
  organizationId: string,
  serviceSlug: string,
  id: string,
  input: NonConformityUpdateInput,
): Promise<void> {
  try {
    await apiClient.patch(
      `/admin/organizations/${organizationId}/dashboard/${serviceSlug}/non-conformities/${id}`,
      input,
    )
  } catch (err) {
    rethrow(err)
  }
}
