import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { ContactFormValues } from '@/types/contact'

const endpoint = import.meta.env.VITE_CONTACT_API_ENDPOINT

/** Errores 422 del backend, mapeados por campo — ver POST /api/contact en /backend. */
export class ContactValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Contact form validation failed')
    this.name = 'ContactValidationError'
    this.fieldErrors = fieldErrors
  }
}

export async function postContact(payload: ContactFormValues): Promise<void> {
  if (!endpoint) {
    throw new Error('VITE_CONTACT_API_ENDPOINT no está definido. Revisa tu archivo .env.')
  }
  try {
    await apiClient.post(endpoint, payload)
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 422) {
      const data = err.response.data as { errors?: Record<string, string> }
      throw new ContactValidationError(data.errors ?? {})
    }
    throw err
  }
}
