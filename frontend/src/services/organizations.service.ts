import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type {
  CreateOrganizationFormValues,
  OrganizationListItem,
  ServiceOption,
  UpdateOrganizationFormValues,
} from '@/types/organization'

export class OrganizationValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Organization form validation failed')
    this.name = 'OrganizationValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class OrganizationRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'OrganizationRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new OrganizationValidationError(data.errors)
    throw new OrganizationRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listServices(): Promise<ServiceOption[]> {
  try {
    const { data } = await apiClient.get('/admin/services')
    return data.services
  } catch (err) {
    rethrow(err)
  }
}

export async function createOrganization(values: CreateOrganizationFormValues): Promise<void> {
  try {
    await apiClient.post('/admin/organizations', values)
  } catch (err) {
    rethrow(err)
  }
}

export async function listOrganizationsFull(options?: { deletedOnly?: boolean }): Promise<OrganizationListItem[]> {
  try {
    const { data } = await apiClient.get('/admin/organizations/full', {
      params: options?.deletedOnly ? { deletedOnly: 'true' } : undefined,
    })
    return data.organizations
  } catch (err) {
    rethrow(err)
  }
}

export async function updateOrganization(organizationId: string, values: UpdateOrganizationFormValues): Promise<void> {
  try {
    await apiClient.patch(`/admin/organizations/${organizationId}`, values)
  } catch (err) {
    rethrow(err)
  }
}

export async function deleteOrganization(organizationId: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/organizations/${organizationId}`)
  } catch (err) {
    rethrow(err)
  }
}

export async function restoreOrganization(organizationId: string): Promise<void> {
  try {
    await apiClient.post(`/admin/organizations/${organizationId}/restore`)
  } catch (err) {
    rethrow(err)
  }
}
