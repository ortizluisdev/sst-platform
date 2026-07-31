import type { MeasurementType } from './variableCatalog'

export type SemaphoreStatus = 'VERDE' | 'AMARILLO' | 'ROJO'

/** Estado de una tarjeta-resumen por variable: los 3 semáforos reales, más
 * SIN_DATOS para cuando la organización aún no ha cargado ninguna
 * evaluación (el catálogo contratado ya existe, pero no hay valor que
 * comparar contra la norma todavía), y SIN_NORMA — puramente de
 * presentación, nunca lo devuelve el backend — para cuando SÍ hay una
 * lectura pero el catálogo todavía no tiene limiteMin/limiteMax definidos.
 * calculateSemaphore() (backend) marca ese caso como AMARILLO por
 * seguridad, pero mostrarlo igual que una alerta real confunde: parece
 * "fuera de norma" cuando en realidad es "no hay con qué comparar todavía".
 * Ver resolveDisplayStatus.ts, que separa ambos casos solo para pintar. */
export type CategoryCardStatus = SemaphoreStatus | 'SIN_DATOS' | 'SIN_NORMA'

export interface WorkPointReading {
  id: string
  workPointCodigo: string
  workPointNombre: string
  areaPlanta: string
  procesoActividad: string
  valor: number
  semaforo: SemaphoreStatus
  isCorrected: boolean
  correctionReason: string | null
}

export interface VariableSummary {
  definitionId: string
  codigo: string
  nombre: string
  unidadMedida: string
  limiteMin: number | null
  limiteMax: number | null
  normativaRef: string | null
  tipo: MeasurementType | null
  instrumento: string | null
  incertidumbre: string | null
  promedio: number
  cumplimientoPct: number
  estado: CategoryCardStatus
  readings: WorkPointReading[]
}

export interface CategorySummary {
  categoria: string
  variables: VariableSummary[]
}

export type NonConformityPriority = 'ALTA' | 'MEDIA' | 'BAJA'
export type NonConformityStatus = 'ABIERTA' | 'EN_SEGUIMIENTO' | 'CERRADA'
export type NonConformityOrigin = 'AUTO' | 'MANUAL'

/** Fila de "Recomendaciones / No conformidades" — híbrida: el sistema genera
 * una por cada lectura fuera de norma (origen AUTO) y el admin puede además
 * redactar las suyas (origen MANUAL) y editar el estado de cualquiera. */
export interface NonConformity {
  id: string
  origen: NonConformityOrigin
  prioridad: NonConformityPriority
  descripcion: string
  variableNombre: string
  zona: string | null
  fecha: string
  estado: NonConformityStatus
}

export interface NonConformityInput {
  descripcion: string
  prioridad: NonConformityPriority
  variableNombre: string
  zona?: string
  estado: NonConformityStatus
}

export interface NonConformityUpdateInput {
  descripcion?: string
  prioridad?: NonConformityPriority
  estado?: NonConformityStatus
}

export interface GlobalCompliance {
  pct: number
  verde: number
  amarillo: number
  rojo: number
  total: number
}

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO'

/** "Riesgo global promedio" — metodología propuesta (backend/src/utils/riskLevel.ts),
 * pendiente de validación formal con el cliente final. `null` cuando ninguna
 * medición del periodo filtrado tiene norma aplicable (todas "sin norma"). */
export interface GlobalRisk {
  nivel: RiskLevel
  promedio: number
}

export interface TrendPoint {
  fecha: string
  promedios: Record<string, number>
}

export interface DashboardFiltersAvailable {
  areasPlanta: string[]
  procesosActividad: string[]
}

export interface DashboardFilters {
  uploadId?: string
  areaPlanta?: string
  procesoActividad?: string
}

/** "Periodo" = una carga (VariableUpload), no un corte de calendario — ver
 * backend/src/utils/trendAnalysis.ts. */
export interface TendenciaGlobal {
  deltaPct: number
  actualPct: number
  anteriorPct: number
}

export interface EvolucionIghoPoint {
  fecha: string
  pct: number
}

export interface ProbabilidadIncumplimiento {
  probabilidadPct: number
  fechaProyeccion: string
}

export type IntervencionPrioridad = 'ALTA' | 'MEDIA' | 'BAJA'
export type MatrizCuadrante = 'CRITICO' | 'VIGILAR' | 'PRIORITARIO' | 'ACEPTABLE'

export interface DashboardData {
  service: { slug: string; nombre: string; updateFrequency: 'WEEKLY' | 'BIWEEKLY' }
  lastUpdated: string | null
  totalWorkPoints: number
  categories: CategorySummary[]
  globalCompliance: GlobalCompliance
  riesgoGlobal: GlobalRisk | null
  alertasActivas: number
  /** `null` = datos insuficientes (menos de 2-3 periodos con historial,
   * según el mínimo de cada cálculo — ver trendAnalysis.ts). */
  tendenciaGlobal: TendenciaGlobal | null
  evolucionIgho: EvolucionIghoPoint[] | null
  probabilidadIncumplimiento: ProbabilidadIncumplimiento | null
  /** Grupo B (interventionAnalysis.ts) — metodologías propuestas, aprobadas
   * para calcular pero pendientes de validación formal con el cliente/
   * responsable SST. `null` cuando ninguna lectura del periodo tiene norma
   * aplicable (mismo caso que riesgoGlobal=null). */
  riesgoSalud: GlobalRisk | null
  puntajeIntervencion: number | null
  prioridadIntervencion: IntervencionPrioridad | null
  matrizPosicion: MatrizCuadrante | null
  trend: TrendPoint[]
  filtrosDisponibles: DashboardFiltersAvailable
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
  hasOmittedRows: boolean
}

export interface UploadOmittedRow {
  nombre: string
  motivo: 'sin_variable_equivalente' | 'valor_no_numerico' | 'ya_corregida'
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
  isCorrected: boolean
  correctedAt: string | null
  correctionReason: string | null
}

export interface UploadDetail {
  id: string
  fechaEvaluacion: string
  createdAt: string
  originalFile: string
  status: 'PENDIENTE' | 'PROCESADO' | 'ERROR'
  uploadedByNombre: string
  omittedRows: UploadOmittedRow[]
  readings: UploadDetailReading[]
}
