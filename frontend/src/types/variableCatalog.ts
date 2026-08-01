export type MeasurementType = 'MEDICION' | 'CALCULO' | 'INSPECCION'

export interface VariableCatalogItem {
  id: string
  codigo: string
  nombre: string
  unidadMedida: string
  tipo: MeasurementType | null
  instrumento: string | null
  incertidumbre: string | null
  simbolo: string | null
}

export interface VariableCatalogCategory {
  categoria: string
  variables: VariableCatalogItem[]
}

export interface UpdateVariableCatalogValues {
  tipo?: MeasurementType
  instrumento?: string
  incertidumbre?: string
  simbolo?: string
}
