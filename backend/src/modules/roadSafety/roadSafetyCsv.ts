function escapeCsv(value: string | number | null): string {
  if (value == null) return ''
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function toRows(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) lines.push(row.map(escapeCsv).join(','))
  return '﻿' + lines.join('\r\n')
}

function fechaCsv(fecha: Date | null): string | null {
  return fecha ? fecha.toISOString().slice(0, 10) : null
}

interface PesvPasoRow {
  fase: string
  paso: number
  elemento: string
  nivelAplicable: string | null
  cumplimiento: string | null
  porcentajeAvance: number | null
  evidencia: string | null
  observaciones: string | null
}

/** CSV de Hoja 1 · Generalidad (bloque PESV) — mismas columnas de la
 * plantilla, en el mismo orden. */
export function buildHoja1Csv(pasos: PesvPasoRow[]): string {
  return toRows(
    ['Fase', 'Paso', 'Elemento del PESV', 'Nivel aplicable', 'Cumplimiento', '% avance', 'Evidencia', 'Observaciones'],
    pasos.map((p) => [p.fase, p.paso, p.elemento, p.nivelAplicable, p.cumplimiento, p.porcentajeAvance, p.evidencia, p.observaciones]),
  )
}

interface VehiculoRow {
  placa: string
  tipo: string | null
  marcaLinea: string | null
  modeloAnio: number | null
  ciudad: string | null
  zona: string | null
  sede: string | null
  rutasAsignadas: string | null
  conductoresAsignados: string | null
  soatVence: Date | null
  diasSoat: number | null
  rtmVence: Date | null
  diasRtm: number | null
  polizaRcVence: Date | null
  tarjetaOperacionVence: Date | null
  comparendos: number
  ultMantenimiento: Date | null
  kmActual: number | null
  kmProxMant: number | null
  cambioAceite: Date | null
  pruebaFrenado: string | null
  alineacionBalanceo: Date | null
  llantasLabradoMm: number | null
  lucesSenales: string | null
  preoperacionalUlt: Date | null
  consumoGalMes: number | null
  rendimientoKmGal: number | null
  rendimientoBaseKmGal: number | null
  anomaliaConsumoPct: number | null
  seguridadActiva: boolean | null
  seguridadPasiva: boolean | null
  gpsTelemetria: boolean | null
  alerta: string
}

const SI_NO = (v: boolean | null) => (v == null ? null : v ? 'Sí' : 'No')

/** CSV de Hoja 2 · Vehículos — las 33 columnas exactas de la plantilla,
 * incluyendo las 4 calculadas (Días SOAT/RTM, Anomalía, Alerta). */
export function buildHoja2Csv(vehiculos: VehiculoRow[]): string {
  return toRows(
    [
      'Placa', 'Tipo', 'Marca / línea', 'Modelo (año)', 'Ciudad', 'Zona', 'Sede', 'Ruta(s) asignada(s)', 'Conductor(es) asignado(s)',
      'SOAT vence', 'Días SOAT', 'RTM vence', 'Días RTM', 'Póliza RC vence', 'Tarjeta operación vence', 'Comparendos (RUNT)',
      'Últ. mantenimiento', 'Km actual', 'Km próx. mant.', 'Cambio de aceite', 'Prueba de frenado', 'Alineación y balanceo',
      'Llantas – labrado (mm)', 'Luces y señales', 'Preoperacional (últ.)', 'Consumo (gal/mes)', 'Rendimiento (km/gal)',
      'Rendimiento base (km/gal)', 'Anomalía consumo (%)', 'Seguridad activa (ABS/ESP)', 'Seguridad pasiva (airbag/cinturón)',
      'GPS / telemetría', 'Alerta',
    ],
    vehiculos.map((v) => [
      v.placa, v.tipo, v.marcaLinea, v.modeloAnio, v.ciudad, v.zona, v.sede, v.rutasAsignadas, v.conductoresAsignados,
      fechaCsv(v.soatVence), v.diasSoat, fechaCsv(v.rtmVence), v.diasRtm, fechaCsv(v.polizaRcVence), fechaCsv(v.tarjetaOperacionVence),
      v.comparendos, fechaCsv(v.ultMantenimiento), v.kmActual, v.kmProxMant, fechaCsv(v.cambioAceite), v.pruebaFrenado,
      fechaCsv(v.alineacionBalanceo), v.llantasLabradoMm, v.lucesSenales, fechaCsv(v.preoperacionalUlt), v.consumoGalMes,
      v.rendimientoKmGal, v.rendimientoBaseKmGal, v.anomaliaConsumoPct, SI_NO(v.seguridadActiva), SI_NO(v.seguridadPasiva),
      SI_NO(v.gpsTelemetria), v.alerta,
    ]),
  )
}

interface ConductorRow {
  documento: string
  nombre: string
  cargo: string | null
  actorVial: string | null
  ciudad: string | null
  sede: string | null
  vehiculosAsignados: string | null
  licCategoria: string | null
  licenciaVence: Date | null
  diasLicencia: number | null
  psicosensometricoVence: Date | null
  estadoSalud: string | null
  nCursosSv: number | null
  horasFormacion: number | null
  ultimaCapacitacion: Date | null
  reentrenamientoProgramado: Date | null
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
  resultado: string | null
  alerta: string
}

/** CSV de Hoja 3 · Personas — las 28 columnas exactas de la plantilla,
 * incluyendo ICC/Resultado/Días licencia/Alerta calculados. */
export function buildHoja3Csv(conductores: ConductorRow[]): string {
  return toRows(
    [
      'Documento', 'Nombre', 'Cargo', 'Actor vial', 'Ciudad', 'Sede', 'Vehículo(s) asignado(s)', 'Lic. categoría',
      'Licencia vence', 'Días licencia', 'Psicosensométrico vence', 'Estado de salud', 'N° cursos SV', 'Horas de formación',
      'Última capacitación', 'Reentrenamiento programado', 'Conducción segura', 'Manejo defensivo', 'Manejo comentado diurno',
      'Manejo comentado nocturno', 'Conocimiento del vehículo', 'Normas de tránsito', 'Gestión de fatiga',
      'Investigación de siniestros', 'Primeros auxilios', 'ICC', 'Resultado', 'Alerta',
    ],
    conductores.map((c) => [
      c.documento, c.nombre, c.cargo, c.actorVial, c.ciudad, c.sede, c.vehiculosAsignados, c.licCategoria,
      fechaCsv(c.licenciaVence), c.diasLicencia, fechaCsv(c.psicosensometricoVence), c.estadoSalud, c.nCursosSv, c.horasFormacion,
      fechaCsv(c.ultimaCapacitacion), fechaCsv(c.reentrenamientoProgramado), c.scoreConduccionSegura, c.scoreManejoDefensivo,
      c.scoreManejoComentadoDiurno, c.scoreManejoComentadoNocturno, c.scoreConocimientoVehiculo, c.scoreNormasTransito,
      c.scoreGestionFatiga, c.scoreInvestigacionSiniestros, c.scorePrimerosAuxilios, c.icc, c.resultado, c.alerta,
    ]),
  )
}

interface RutaPuntoRow {
  kmViaReferencia: string | null
  senalesTransito: string | null
  aspectosRelevantes: string | null
  controlesExistentes: string | null
  recomendacionesSeguridad: string | null
  riesgoMasRelevante: string | null
}

/** CSV de Hoja 4 · Rutograma (tabla "Puntos de la ruta") — el resto de la
 * ficha (encabezado, organismos de apoyo, condiciones de riesgo) es
 * formato ficha, no tabular, así que no aplica a un CSV de filas. */
export function buildHoja4Csv(puntos: RutaPuntoRow[]): string {
  return toRows(
    ['KM / vía / referencia', 'Señales de tránsito', 'Aspectos relevantes', 'Controles existentes', 'Recomendaciones de seguridad', 'Riesgo más relevante'],
    puntos.map((p) => [p.kmViaReferencia, p.senalesTransito, p.aspectosRelevantes, p.controlesExistentes, p.recomendacionesSeguridad, p.riesgoMasRelevante]),
  )
}
