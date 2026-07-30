import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { BrandingFormValues } from '@/types/organizationBranding'

export class BrandingValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Branding form validation failed')
    this.name = 'BrandingValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class BrandingRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'BrandingRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new BrandingValidationError(data.errors)
    throw new BrandingRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function saveBranding(values: BrandingFormValues): Promise<{ applied: boolean }> {
  try {
    const { data } = await apiClient.patch('/dashboard/organization/branding', values)
    return data
  } catch (err) {
    rethrow(err)
  }
}
