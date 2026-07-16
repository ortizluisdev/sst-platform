import { apiClient } from './api'
import type { ContactFormValues } from '@/types/contact'

const endpoint = import.meta.env.VITE_CONTACT_API_ENDPOINT

export async function postContact(payload: ContactFormValues): Promise<void> {
  if (!endpoint) {
    throw new Error('VITE_CONTACT_API_ENDPOINT no está definido. Revisa tu archivo .env.')
  }
  await apiClient.post(endpoint, payload)
}
