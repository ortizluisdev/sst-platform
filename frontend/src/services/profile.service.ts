import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { ProfileFormValues } from '@/types/profile'

export class ProfileValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Profile form validation failed')
    this.name = 'ProfileValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class ProfileRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ProfileRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new ProfileValidationError(data.errors)
    throw new ProfileRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function updateProfile(values: ProfileFormValues): Promise<void> {
  try {
    await apiClient.patch('/auth/profile', values)
  } catch (err) {
    rethrow(err)
  }
}
