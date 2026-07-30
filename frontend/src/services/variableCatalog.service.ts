import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { VariableCatalogCategory, UpdateVariableCatalogValues } from '@/types/variableCatalog'

export class VariableCatalogValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Variable catalog validation failed')
    this.name = 'VariableCatalogValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class VariableCatalogRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'VariableCatalogRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new VariableCatalogValidationError(data.errors)
    throw new VariableCatalogRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listVariableCatalog(serviceSlug: string): Promise<VariableCatalogCategory[]> {
  try {
    const { data } = await apiClient.get(`/admin/services/${serviceSlug}/variables`)
    return data.categories
  } catch (err) {
    rethrow(err)
  }
}

export async function updateVariableCatalogItem(
  serviceSlug: string,
  variableId: string,
  values: UpdateVariableCatalogValues,
): Promise<void> {
  try {
    await apiClient.patch(`/admin/services/${serviceSlug}/variables/${variableId}`, values)
  } catch (err) {
    rethrow(err)
  }
}
