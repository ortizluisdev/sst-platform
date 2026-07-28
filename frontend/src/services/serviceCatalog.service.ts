import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { CatalogService, CreateServiceFormValues, UpdateServiceFormValues } from '@/types/serviceCatalog'
import type { ServiceOption } from '@/types/organization'

export class ServiceCatalogValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Service form validation failed')
    this.name = 'ServiceCatalogValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class ServiceCatalogRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ServiceCatalogRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new ServiceCatalogValidationError(data.errors)
    throw new ServiceCatalogRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listAllServices(): Promise<CatalogService[]> {
  try {
    const { data } = await apiClient.get('/admin/services', { params: { includeInactive: 'true' } })
    return data.services
  } catch (err) {
    rethrow(err)
  }
}

/** Catálogo activo (los 5 servicios con isActive: true) — alimenta la
 * sección "Operación" del sidebar admin. El admin ve siempre el catálogo
 * completo (hace CRUD de todo); es el CLIENTE quien está acotado a sus
 * servicios contratados, no el admin. */
export async function listActiveServices(): Promise<ServiceOption[]> {
  try {
    const { data } = await apiClient.get('/admin/services')
    return data.services
  } catch (err) {
    rethrow(err)
  }
}

export async function createService(values: CreateServiceFormValues): Promise<CatalogService> {
  try {
    const { data } = await apiClient.post('/admin/services', values)
    return data.service
  } catch (err) {
    rethrow(err)
  }
}

export async function updateService(serviceId: string, values: UpdateServiceFormValues): Promise<CatalogService> {
  try {
    const { data } = await apiClient.patch(`/admin/services/${serviceId}`, values)
    return data.service
  } catch (err) {
    rethrow(err)
  }
}
