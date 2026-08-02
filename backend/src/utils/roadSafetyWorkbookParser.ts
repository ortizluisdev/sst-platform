import ExcelJS from 'exceljs'
import type { CondicionRiesgoClave } from './roadSafetyConstants.js'

export class RoadSafetyParseError extends Error {}

export interface ParsedPesvPaso {
  fase: string
  paso: number
  elemento: string
  nivelAplicable: string | null
  cumplimiento: string
  porcentajeAvance: number | null
  evidencia: string | null
  observaciones: string | null
}

export interface ParsedInventarioItem {
  grupo: 'ACTORES_VIALES' | 'PARQUE_AUTOMOTOR' | 'COBERTURA_OPERACIONAL'
  concepto: string
  cantidad: number
  observaciones: string | null
}

export interface ParsedVehiculo {
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
  rtmVence: Date | null
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
  seguridadActiva: boolean | null
  seguridadPasiva: boolean | null
  gpsTelemetria: boolean | null
}

export interface ParsedConductor {
  documento: string
  nombre: string
  cargo: string | null
  actorVial: string | null
  ciudad: string | null
  sede: string | null
  vehiculosAsignados: string | null
  licCategoria: string | null
  licenciaVence: Date | null
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
}

export interface ParsedRutaPunto {
  orden: number
  kmViaReferencia: string | null
  senalesTransito: string | null
  aspectosRelevantes: string | null
  controlesExistentes: string | null
  recomendacionesSeguridad: string | null
  riesgoMasRelevante: string | null
}

export interface ParsedRuta {
  codigo: string | null
  version: string | null
  fecha: Date | null
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
  condicionesRiesgo: Record<CondicionRiesgoClave, boolean>
  organismosApoyoLocal: { entidad: string; municipio: string; contacto: string; telefono1: string; telefono2: string }[]
  puntos: ParsedRutaPunto[]
}

export interface RoadSafetyParseResult {
  pesvPasos: ParsedPesvPaso[]
  inventario: ParsedInventarioItem[]
  vehiculos: ParsedVehiculo[]
  conductores: ParsedConductor[]
  ruta: ParsedRuta | null
}

const SHEET_NAMES = {
  hoja1: 'Hoja 1 · Generalidad',
  hoja2: 'Hoja 2 · Vehículos',
  hoja3: 'Hoja 3 · Personas',
  hoja4: 'Hoja 4 · Rutograma',
} as const

function cellText(ws: ExcelJS.Worksheet, row: number, col: number): string | null {
  const value = ws.getCell(row, col).value
  if (value == null) return null
  if (typeof value === 'object' && 'richText' in value) {
    return (value.richText as { text: string }[]).map((t) => t.text).join('')
  }
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function cellNumber(ws: ExcelJS.Worksheet, row: number, col: number): number | null {
  const value = ws.getCell(row, col).value
  if (value == null || value === '') return null
  const num = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isNaN(num) ? null : num
}

function cellDate(ws: ExcelJS.Worksheet, row: number, col: number): Date | null {
  const value = ws.getCell(row, col).value
  if (value instanceof Date) return value
  return null
}

function cellBoolSiNo(ws: ExcelJS.Worksheet, row: number, col: number): boolean | null {
  const text = cellText(ws, row, col)
  if (text == null) return null
  return text.trim().toLowerCase() === 'sí' || text.trim().toLowerCase() === 'si'
}

/**
 * Parsea el libro completo de Seguridad Vial (registro_seguridad_vial_MSSV_1.xlsx)
 * — formato fijo del cliente, posiciones de fila/columna literales (no se
 * permite cambiar el formato, ver spec). Cada hoja de captura es opcional
 * (si el cliente sube solo una parte, las demás quedan vacías en el
 * resultado en vez de fallar todo el archivo).
 */
export async function parseRoadSafetyWorkbook(buffer: Buffer): Promise<RoadSafetyParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as any)

  const hoja1 = workbook.getWorksheet(SHEET_NAMES.hoja1)
  const hoja2 = workbook.getWorksheet(SHEET_NAMES.hoja2)
  const hoja3 = workbook.getWorksheet(SHEET_NAMES.hoja3)
  const hoja4 = workbook.getWorksheet(SHEET_NAMES.hoja4)

  if (!hoja1 && !hoja2 && !hoja3 && !hoja4) {
    throw new RoadSafetyParseError(
      'El archivo no tiene ninguna de las hojas esperadas (Hoja 1 · Generalidad, Hoja 2 · Vehículos, Hoja 3 · Personas, Hoja 4 · Rutograma).',
    )
  }

  return {
    pesvPasos: hoja1 ? parsePesvPasos(hoja1) : [],
    inventario: hoja1 ? parseInventario(hoja1) : [],
    vehiculos: hoja2 ? parseVehiculos(hoja2) : [],
    conductores: hoja3 ? parseConductores(hoja3) : [],
    ruta: hoja4 ? parseRuta(hoja4) : null,
  }
}

// --- Hoja 1 · Generalidad ------------------------------------------------
// Tabla PESV: encabezados fila 5, datos filas 6-29 (24 pasos fijos).
function parsePesvPasos(ws: ExcelJS.Worksheet): ParsedPesvPaso[] {
  const pasos: ParsedPesvPaso[] = []
  for (let row = 6; row <= 29; row++) {
    const fase = cellText(ws, row, 1)
    const pasoNum = cellNumber(ws, row, 2)
    const elemento = cellText(ws, row, 3)
    if (!fase || pasoNum == null || !elemento) continue

    pasos.push({
      fase,
      paso: pasoNum,
      elemento,
      nivelAplicable: cellText(ws, row, 4),
      cumplimiento: cellText(ws, row, 5) ?? 'No cumple',
      porcentajeAvance: cellNumber(ws, row, 6),
      evidencia: cellText(ws, row, 7),
      observaciones: cellText(ws, row, 8),
    })
  }
  return pasos
}

// Inventario: 3 bloques con título propio y tabla Tipo/Cantidad/Observaciones
// — filas 34-41 (actores viales), 46-50 (parque automotor), 55-58 (cobertura).
const INVENTARIO_BLOQUES: { grupo: ParsedInventarioItem['grupo']; desde: number; hasta: number }[] = [
  { grupo: 'ACTORES_VIALES', desde: 34, hasta: 41 },
  { grupo: 'PARQUE_AUTOMOTOR', desde: 46, hasta: 50 },
  { grupo: 'COBERTURA_OPERACIONAL', desde: 55, hasta: 58 },
]

function parseInventario(ws: ExcelJS.Worksheet): ParsedInventarioItem[] {
  const items: ParsedInventarioItem[] = []
  for (const bloque of INVENTARIO_BLOQUES) {
    for (let row = bloque.desde; row <= bloque.hasta; row++) {
      const concepto = cellText(ws, row, 1)
      const cantidad = cellNumber(ws, row, 4)
      if (!concepto || concepto.toLowerCase().startsWith('total') || cantidad == null) continue
      items.push({ grupo: bloque.grupo, concepto, cantidad, observaciones: cellText(ws, row, 5) })
    }
  }
  return items
}

// --- Hoja 2 · Vehículos ---------------------------------------------------
// Encabezados en fila 5 (2 filas de título antes), datos desde fila 6 hasta
// la primera fila con Placa vacía.
function parseVehiculos(ws: ExcelJS.Worksheet): ParsedVehiculo[] {
  const vehiculos: ParsedVehiculo[] = []
  for (let row = 6; row <= ws.rowCount; row++) {
    const placa = cellText(ws, row, 1)
    if (!placa) continue

    vehiculos.push({
      placa,
      tipo: cellText(ws, row, 2),
      marcaLinea: cellText(ws, row, 3),
      modeloAnio: cellNumber(ws, row, 4),
      ciudad: cellText(ws, row, 5),
      zona: cellText(ws, row, 6),
      sede: cellText(ws, row, 7),
      rutasAsignadas: cellText(ws, row, 8),
      conductoresAsignados: cellText(ws, row, 9),
      soatVence: cellDate(ws, row, 10),
      rtmVence: cellDate(ws, row, 12),
      polizaRcVence: cellDate(ws, row, 14),
      tarjetaOperacionVence: cellDate(ws, row, 15),
      comparendos: cellNumber(ws, row, 16) ?? 0,
      ultMantenimiento: cellDate(ws, row, 17),
      kmActual: cellNumber(ws, row, 18),
      kmProxMant: cellNumber(ws, row, 19),
      cambioAceite: cellDate(ws, row, 20),
      pruebaFrenado: cellText(ws, row, 21),
      alineacionBalanceo: cellDate(ws, row, 22),
      llantasLabradoMm: cellNumber(ws, row, 23),
      lucesSenales: cellText(ws, row, 24),
      preoperacionalUlt: cellDate(ws, row, 25),
      consumoGalMes: cellNumber(ws, row, 26),
      rendimientoKmGal: cellNumber(ws, row, 27),
      rendimientoBaseKmGal: cellNumber(ws, row, 28),
      seguridadActiva: cellBoolSiNo(ws, row, 30),
      seguridadPasiva: cellBoolSiNo(ws, row, 31),
      gpsTelemetria: cellBoolSiNo(ws, row, 32),
    })
  }
  return vehiculos
}

// --- Hoja 3 · Personas -----------------------------------------------------
function parseConductores(ws: ExcelJS.Worksheet): ParsedConductor[] {
  const conductores: ParsedConductor[] = []
  for (let row = 6; row <= ws.rowCount; row++) {
    const documento = cellText(ws, row, 1)
    if (!documento) continue

    conductores.push({
      documento,
      nombre: cellText(ws, row, 2) ?? documento,
      cargo: cellText(ws, row, 3),
      actorVial: cellText(ws, row, 4),
      ciudad: cellText(ws, row, 5),
      sede: cellText(ws, row, 6),
      vehiculosAsignados: cellText(ws, row, 7),
      licCategoria: cellText(ws, row, 8),
      licenciaVence: cellDate(ws, row, 9),
      psicosensometricoVence: cellDate(ws, row, 11),
      estadoSalud: cellText(ws, row, 12),
      nCursosSv: cellNumber(ws, row, 13),
      horasFormacion: cellNumber(ws, row, 14),
      ultimaCapacitacion: cellDate(ws, row, 15),
      reentrenamientoProgramado: cellDate(ws, row, 16),
      scoreConduccionSegura: cellNumber(ws, row, 17),
      scoreManejoDefensivo: cellNumber(ws, row, 18),
      scoreManejoComentadoDiurno: cellNumber(ws, row, 19),
      scoreManejoComentadoNocturno: cellNumber(ws, row, 20),
      scoreConocimientoVehiculo: cellNumber(ws, row, 21),
      scoreNormasTransito: cellNumber(ws, row, 22),
      scoreGestionFatiga: cellNumber(ws, row, 23),
      scoreInvestigacionSiniestros: cellNumber(ws, row, 24),
      scorePrimerosAuxilios: cellNumber(ws, row, 25),
    })
  }
  return conductores
}

// --- Hoja 4 · Rutograma -----------------------------------------------------
// Formato ficha (no tabular): cada dato vive en una celda fija, no en
// columnas con encabezado — ver spec, secciones "Encabezado"/"Información
// general"/etc. reproducidas tal cual del Excel de referencia.
const CONDICIONES_LAYOUT: { fila: number; izquierda: CondicionRiesgoClave; derecha: CondicionRiesgoClave }[] = [
  { fila: 38, izquierda: 'senalizacionNormas', derecha: 'calzadaSinPavimentar' },
  { fila: 39, izquierda: 'accidentesGeograficos', derecha: 'altoFlujoVehicular' },
  { fila: 40, izquierda: 'riesgoPublico', derecha: 'curvasPeligrosas' },
  { fila: 41, izquierda: 'pendientes', derecha: 'zonasPobladas' },
  { fila: 42, izquierda: 'senalizacionInadecuada', derecha: 'iluminacionDeficiente' },
  { fila: 43, izquierda: 'intervencionesVia', derecha: 'semovientes' },
  { fila: 44, izquierda: 'puenteVehicular', derecha: 'naturales' },
]

const ORGANISMO_LOCAL_FILAS = [24, 25, 26, 27]

function parseRuta(ws: ExcelJS.Worksheet): ParsedRuta | null {
  const idRuta = cellText(ws, 6, 5)
  if (!idRuta) return null

  const condicionesRiesgo = {} as Record<CondicionRiesgoClave, boolean>
  for (const { fila, izquierda, derecha } of CONDICIONES_LAYOUT) {
    condicionesRiesgo[izquierda] = cellText(ws, fila, 2) != null
    condicionesRiesgo[derecha] = cellText(ws, fila, 5) != null
  }

  const organismosApoyoLocal = ORGANISMO_LOCAL_FILAS.map((fila) => ({
    entidad: cellText(ws, fila, 1) ?? '',
    municipio: cellText(ws, fila, 2) ?? '',
    contacto: cellText(ws, fila, 3) ?? '',
    telefono1: cellText(ws, fila, 4) ?? '',
    telefono2: cellText(ws, fila, 5) ?? '',
  })).filter((o) => o.entidad)

  const puntos: ParsedRutaPunto[] = []
  for (let row = 48, orden = 1; row <= ws.rowCount; row++) {
    const kmViaReferencia = cellText(ws, row, 1)
    if (!kmViaReferencia) continue
    puntos.push({
      orden: orden++,
      kmViaReferencia,
      senalesTransito: cellText(ws, row, 2),
      aspectosRelevantes: cellText(ws, row, 3),
      controlesExistentes: cellText(ws, row, 4),
      recomendacionesSeguridad: cellText(ws, row, 5),
      riesgoMasRelevante: cellText(ws, row, 6),
    })
  }

  return {
    codigo: cellText(ws, 5, 2),
    version: cellText(ws, 5, 5),
    fecha: cellDate(ws, 6, 2) ?? parseSpanishDate(cellText(ws, 6, 2)),
    idRuta,
    clienteProyecto: cellText(ws, 7, 2),
    origen: cellText(ws, 9, 2),
    destino: cellText(ws, 9, 5),
    rutaAlterna: cellText(ws, 10, 2),
    sitiosParada: cellText(ws, 10, 5),
    kmsRecorridos: cellText(ws, 11, 2),
    duracion: cellText(ws, 11, 5),
    sstNombreTelefono: cellText(ws, 13, 2),
    operacionesNombreTelefono: cellText(ws, 13, 5),
    condicionesRiesgo,
    organismosApoyoLocal,
    puntos,
  }
}

/** El Excel de referencia trae "Fecha" como texto "dd/mm/aaaa" en vez de
 * fecha nativa en esta celda puntual (a diferencia de Hoja 2/3) — se
 * intenta parsear ese formato antes de dejarla en null. */
function parseSpanishDate(text: string | null): Date | null {
  if (!text) return null
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim())
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}
