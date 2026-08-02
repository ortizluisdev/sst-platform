// Espejo de los tipos de respuesta de backend/src/modules/roadSafety/ — ver
// roadSafety.service.ts (getDashboardHoja1-4, getAlertasPanel).

export interface RoadSafetyUploadRecord {
  id: string
  originalFile: string
  counts: { pesvPasos: number; inventario: number; vehiculos: number; conductores: number; rutaPuntos: number }
  uploadedByNombre: string
  createdAt: string
}

export interface RoadSafetyPesvPaso {
  fase: string
  paso: number
  elemento: string
  nivelAplicable: string | null
  cumplimiento: 'Cumple' | 'Parcial' | 'No cumple' | null
  porcentajeAvance: number | null
  evidencia: string | null
  observaciones: string | null
}

export interface RoadSafetyInventarioGrupo {
  items: { concepto: string; cantidad: number; observaciones: string | null }[]
  total: number
}

export interface RoadSafetyHoja1Data {
  pasos: RoadSafetyPesvPaso[]
  cumplimientoPesvGlobal: number | null
  inventario: {
    ACTORES_VIALES: RoadSafetyInventarioGrupo
    PARQUE_AUTOMOTOR: RoadSafetyInventarioGrupo
    COBERTURA_OPERACIONAL: RoadSafetyInventarioGrupo
  }
}

export type VehicleAlertState = 'OK' | 'ALERTA' | 'VENCIDO'

export interface RoadSafetyVehiculo {
  id: string
  placa: string
  tipo: string | null
  marcaLinea: string | null
  modeloAnio: number | null
  ciudad: string | null
  zona: string | null
  sede: string | null
  rutasAsignadas: string | null
  conductoresAsignados: string | null
  soatVence: string | null
  diasSoat: number | null
  rtmVence: string | null
  diasRtm: number | null
  polizaRcVence: string | null
  tarjetaOperacionVence: string | null
  comparendos: number
  ultMantenimiento: string | null
  kmActual: number | null
  kmProxMant: number | null
  cambioAceite: string | null
  pruebaFrenado: string | null
  alineacionBalanceo: string | null
  llantasLabradoMm: number | null
  lucesSenales: string | null
  preoperacionalUlt: string | null
  consumoGalMes: number | null
  rendimientoKmGal: number | null
  rendimientoBaseKmGal: number | null
  anomaliaConsumoPct: number | null
  seguridadActiva: boolean | null
  seguridadPasiva: boolean | null
  gpsTelemetria: boolean | null
  alerta: VehicleAlertState
}

export type DriverAlertState = 'OK' | 'ALERTA' | 'LICENCIA_VENCIDA'
export type DriverResult = 'Aprobado' | 'No aprobado'

export interface RoadSafetyConductor {
  id: string
  documento: string
  nombre: string
  cargo: string | null
  actorVial: string | null
  ciudad: string | null
  sede: string | null
  vehiculosAsignados: string | null
  licCategoria: string | null
  licenciaVence: string | null
  diasLicencia: number | null
  psicosensometricoVence: string | null
  estadoSalud: string | null
  nCursosSv: number | null
  horasFormacion: number | null
  ultimaCapacitacion: string | null
  reentrenamientoProgramado: string | null
  scoreConduccionSegura: number | null
  scoreManejoDefensivo: number | null
  scoreManejoComentadoDiurno: number | null
  scoreManejoComentadoNocturno: number | null
  scoreConocimientoVehiculo: number | null
  scoreNormasTransito: number | null
  scoreGestionFatiga: number | null
  scoreInvestigacionSiniestros: number | null
  scorePrimerosAuxilios: number | null
  icc: number | null
  resultado: DriverResult | null
  alerta: DriverAlertState
}

export interface RoadSafetyOrganismoApoyo {
  entidad: string
  municipio: string
  contacto: string
  telefono1: string
  telefono2: string | null
}

export interface RoadSafetyCondicionRiesgo {
  clave: string
  etiqueta: string
  marcado: boolean
}

export interface RoadSafetyRutaPunto {
  id: string
  orden: number
  kmViaReferencia: string | null
  senalesTransito: string | null
  aspectosRelevantes: string | null
  controlesExistentes: string | null
  recomendacionesSeguridad: string | null
  riesgoMasRelevante: string | null
}

export interface RoadSafetyRuta {
  id: string
  codigo: string | null
  version: string | null
  fecha: string | null
  idRuta: string
  clienteProyecto: string | null
  origen: string | null
  destino: string | null
  rutaAlterna: string | null
  sitiosParada: string | null
  kmsRecorridos: string | null
  duracion: string | null
  sstNombreTelefono: string | null
  operacionesNombreTelefono: string | null
  mapaImagenBase64: string | null
  organismosApoyoNacionales: RoadSafetyOrganismoApoyo[]
  organismosApoyoLocal: RoadSafetyOrganismoApoyo[]
  condicionesRiesgo: RoadSafetyCondicionRiesgo[]
  puntos: RoadSafetyRutaPunto[]
}

export interface RoadSafetyAlertasPanel {
  vehiculos: { vencidos: number; enAlerta: number; soatRtmPorVencer: number; conComparendos: number }
  conductores: { licenciasVencidas: number; licenciasPorVencer: number; noAprobados: number; enAlerta: number }
}

export interface RoadSafetyReportMetadata {
  sedePrincipal?: string
  ciudad?: string
  responsablePesv?: string
  nivelPesv?: string
  numeroInforme?: string
  fechaCorte?: string
}

export type RoadSafetyReportTipo = 'h1' | 'h2' | 'h3' | 'h4'
