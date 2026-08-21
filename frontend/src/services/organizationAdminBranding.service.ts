import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { BrandingFormValues, CurrentBranding } from '@/types/organizationBranding'

export class AdminBrandingRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminBrandingRequestError'
    this.status = status
  }
}

export class AdminBrandingValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Branding form validation failed')
    this.name = 'AdminBrandingValidationError'
    this.fieldErrors = fieldErrors
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new AdminBrandingValidationError(data.errors)
    throw new AdminBrandingRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

/** Branding de CUALQUIER empresa, dado su id — para el modal "Marca" en
 * Clientes. Distinto de getBranding() en organizationBranding.service.ts,
 * que siempre lee "mi propia empresa" (el flujo del cliente). */
export async function getOrganizationBranding(organizationId: string): Promise<CurrentBranding> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/branding`)
    return data
  } catch (err) {
    rethrow(err)
  }
}

export async function updateOrganizationBranding(organizationId: string, values: BrandingFormValues): Promise<void> {
  try {
    await apiClient.put(`/admin/organizations/${organizationId}/branding`, values)
  } catch (err) {
    rethrow(err)
  }
}
