import { isAxiosError } from 'axios'
import { apiClient } from './api'

export type HigieneCategoria = 'ESTRES_TERMICO' | 'ILUMINACION' | 'SONIDO' | 'RADIACION_UV' | 'VIBRACION'

export interface CategoryConfigItem {
  categoria: HigieneCategoria
  habilitada: boolean
}

export class CategoryConfigRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CategoryConfigRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string } }
    throw new CategoryConfigRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listCategoryConfig(organizationId: string): Promise<CategoryConfigItem[]> {
  try {
    const { data } = await apiClient.get(`/admin/organizations/${organizationId}/category-config`)
    return data.items
  } catch (err) {
    rethrow(err)
  }
}

/** Guardado inmediato al togglear — sin botón "Guardar" aparte (mismo
 * patrón que el toggle de Service.isActive en ServicesListView). */
export async function updateCategoryConfig(
  organizationId: string,
  categoria: HigieneCategoria,
  habilitada: boolean,
): Promise<void> {
  try {
    await apiClient.patch(`/admin/organizations/${organizationId}/category-config/${categoria}`, { habilitada })
  } catch (err) {
    rethrow(err)
  }
}
