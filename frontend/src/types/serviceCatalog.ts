export interface CatalogService {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  updateFrequency: 'WEEKLY' | 'BIWEEKLY'
  isActive: boolean
  createdAt: string
}

export interface CreateServiceFormValues {
  nombre: string
  descripcion?: string
}

export interface UpdateServiceFormValues {
  nombre?: string
  descripcion?: string | null
  isActive?: boolean
}
