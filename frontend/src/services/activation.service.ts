import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { ActivationFormValues } from '@/types/activation'

export class ActivationRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ActivationRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string } }
    throw new ActivationRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function confirmActivation(values: ActivationFormValues): Promise<void> {
  try {
    await apiClient.post('/activation/confirm', values)
  } catch (err) {
    rethrow(err)
  }
}
