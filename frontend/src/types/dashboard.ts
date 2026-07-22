export type SemaphoreStatus = 'VERDE' | 'AMARILLO' | 'ROJO'

export interface WorkPointReading {
  workPointCodigo: string
  workPointNombre: string
  areaPlanta: string
  valor: number
  semaforo: SemaphoreStatus
}

export interface VariableSummary {
  definitionId: string
  codigo: string
  nombre: string
  unidadMedida: string
  limiteMin: number | null
  limiteMax: number | null
  normativaRef: string | null
  promedio: number
  cumplimientoPct: number
  estado: SemaphoreStatus
  readings: WorkPointReading[]
}

export interface CategorySummary {
  categoria: string
  variables: VariableSummary[]
}

export interface GlobalCompliance {
  pct: number
  verde: number
  amarillo: number
  rojo: number
  total: number
}

export interface TrendPoint {
  fecha: string
  promedios: Record<string, number>
}

export interface DashboardData {
  service: { slug: string; nombre: string; updateFrequency: 'WEEKLY' | 'BIWEEKLY' }
  lastUpdated: string | null
  totalWorkPoints: number
  categories: CategorySummary[]
  globalCompliance: GlobalCompliance
  trend: TrendPoint[]
}

export interface OrganizationOption {
  id: string
  nombre: string
}

export interface UploadHistoryEntry {
  id: string
  fechaEvaluacion: string
  createdAt: string
  originalFile: string
  status: 'PENDIENTE' | 'PROCESADO' | 'ERROR'
  uploadedByNombre: string
  totalLecturas: number
  totalPuestos: number
}

export interface UploadDetailReading {
  workPointCodigo: string
  workPointNombre: string
  areaPlanta: string
  variableCodigo: string
  variableNombre: string
  unidadMedida: string
  valor: number
  semaforo: SemaphoreStatus
}

export interface UploadDetail {
  id: string
  fechaEvaluacion: string
  createdAt: string
  originalFile: string
  status: 'PENDIENTE' | 'PROCESADO' | 'ERROR'
  uploadedByNombre: string
  readings: UploadDetailReading[]
}
