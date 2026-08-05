import { apiClient } from './api'
import { DashboardRequestError } from './dashboard.service'
import { isAxiosError } from 'axios'

export type CatalogTipo = 'zona' | 'seccion' | 'cargo' | 'trabajador'

export interface CatalogItem {
  id: string
  nombre: string
  isActive: boolean
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as {
      status: number
      data: { message?: string; errors?: Record<string, string> }
    }
    throw new DashboardRequestError(status, data.message ?? 'Ocurrió un error', data.errors)
  }
  throw err
}

export async function listOrgCatalog(organizationId: string, tipo: CatalogTipo): Promise<CatalogItem[]> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/catalogs/${tipo}`)
    return data.items
  } catch (err) {
    rethrow(err)
  }
}

export async function createOrgCatalogItem(
  organizationId: string,
  tipo: CatalogTipo,
  nombre: string,
): Promise<CatalogItem> {
  try {
    const { data } = await apiClient.post(`/admin/organizations/${organizationId}/catalogs/${tipo}`, { nombre })
    return data.item
  } catch (err) {
    rethrow(err)
  }
}

export async function updateOrgCatalogItem(
  organizationId: string,
  tipo: CatalogTipo,
  itemId: string,
  data: { nombre?: string; isActive?: boolean },
): Promise<void> {
  try {
    await apiClient.patch(`/admin/organizations/${organizationId}/catalogs/${tipo}/${itemId}`, data)
  } catch (err) {
    rethrow(err)
  }
}
