import { isAxiosError } from 'axios'
import { apiClient } from './api'

export interface ManagedUser {
  id: string
  documentType: 'CC' | 'NIT'
  documentNumber: string
  email: string
  nombre: string
  cargo: string | null
  accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'
  suspendReason: string | null
  createdAt: string
  updatedAt: string
  organizations: { organization: { id: string; nombre: string }; role: { name: string } }[]
}

export class AdminUsersRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminUsersRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string } }
    throw new AdminUsersRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listActiveUsers(): Promise<ManagedUser[]> {
  try {
    const { data } = await apiClient.get('/admin/users/active')
    return data.users
  } catch (err) {
    rethrow(err)
  }
}

export async function listSuspendedUsers(): Promise<ManagedUser[]> {
  try {
    const { data } = await apiClient.get('/admin/users/suspended')
    return data.users
  } catch (err) {
    rethrow(err)
  }
}

export async function reactivateUser(userId: string): Promise<void> {
  try {
    await apiClient.patch(`/admin/users/${userId}/reactivate`)
  } catch (err) {
    rethrow(err)
  }
}

export async function suspendUser(userId: string, suspendReason: string): Promise<void> {
  try {
    await apiClient.patch(`/admin/users/${userId}/suspend`, { suspendReason })
  } catch (err) {
    rethrow(err)
  }
}

export async function listPendingActivationUsers(): Promise<ManagedUser[]> {
  try {
    const { data } = await apiClient.get('/admin/users/pending-activation')
    return data.users
  } catch (err) {
    rethrow(err)
  }
}

export async function resendInvitation(userId: string): Promise<void> {
  try {
    await apiClient.post(`/admin/users/${userId}/resend-invitation`)
  } catch (err) {
    rethrow(err)
  }
}
