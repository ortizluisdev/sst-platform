import { Readable } from 'node:stream'
import ExcelJS from 'exceljs'

export interface VariableFileRow {
  codigoPuesto: string
  nombrePuesto: string
  areaPlanta: string
  procesoActividad: string
  jornada: string
  codigoVariable: string
  valor: number
}

export interface VariableFileOmittedRow {
  nombre: string
  motivo: 'sin_variable_equivalente' | 'valor_no_numerico'
}

export interface VariableFileParseResult {
  rows: VariableFileRow[]
  omitidas: VariableFileOmittedRow[]
}

const EXPECTED_HEADERS = [
  'codigo_puesto',
  'nombre_puesto',
  'area_planta',
  'proceso_actividad',
  'jornada',
  'codigo_variable',
  'valor',
] as const

export class VariableFileParseError extends Error {}

/**
 * Lee CSV o Excel con la misma lógica (ExcelJS soporta ambos formatos vía
 * su propia API — un solo parser, sin duplicar reglas de validación).
 * Columnas esperadas (fila 1, en cualquier orden):
 * codigo_puesto, nombre_puesto, area_planta, proceso_actividad, jornada,
 * codigo_variable, valor.
 *
 * Una fila con "valor" no numérico NO aborta el archivo entero — se omite y
 * se reporta en `omitidas` (mismo criterio que
 * variableReportWorkbookParser.ts: el archivo real del cliente siempre debe
 * poder subirse, con las filas problemáticas señaladas para corregir después
 * en vez de bloquear todo por una sola celda mal digitada).
 */
export async function parseVariableFile(buffer: Buffer, filename: string): Promise<VariableFileParseResult> {
  const workbook = new ExcelJS.Workbook()
  const isCsv = filename.toLowerCase().endsWith('.csv')

  // exceljs trae sus propios @types/node internos, que chocan con los del
  // proyecto para Buffer/Stream (incompatibilidad de tipos, no de runtime) —
  // los `as any` de abajo son solo para esa frontera, la firma pública de
  // esta función sigue completamente tipada.
  const worksheet = isCsv
    ? await workbook.csv.read(bufferToStream(buffer) as any)
    : await workbook.xlsx.load(buffer as any).then((wb) => wb.worksheets[0])

  if (!worksheet || worksheet.rowCount < 2) {
    throw new VariableFileParseError('El archivo está vacío o no tiene filas de datos.')
  }

  const headerRow = worksheet.getRow(1)
  const columnIndex = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '')
      .trim()
      .toLowerCase()
    columnIndex.set(key, colNumber)
  })

  const missing = EXPECTED_HEADERS.filter((h) => !columnIndex.has(h))
  if (missing.length > 0) {
    throw new VariableFileParseError(`Faltan columnas requeridas en el archivo: ${missing.join(', ')}`)
  }

  const rows: VariableFileRow[] = []
  const omitidas: VariableFileOmittedRow[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // header

    const get = (key: string) => row.getCell(columnIndex.get(key)!).value
    const codigoPuesto = String(get('codigo_puesto') ?? '').trim()
    if (!codigoPuesto) return // fila vacía al final del archivo, se ignora

    const codigoVariable = String(get('codigo_variable') ?? '').trim()
    const valorRaw = get('valor')
    const valor = typeof valorRaw === 'number' ? valorRaw : Number(String(valorRaw ?? '').trim())
    if (Number.isNaN(valor)) {
      omitidas.push({ nombre: `Fila ${rowNumber} — ${codigoPuesto} / ${codigoVariable}`, motivo: 'valor_no_numerico' })
      return
    }

    rows.push({
      codigoPuesto,
      nombrePuesto: String(get('nombre_puesto') ?? '').trim(),
      areaPlanta: String(get('area_planta') ?? '').trim(),
      procesoActividad: String(get('proceso_actividad') ?? '').trim(),
      jornada: String(get('jornada') ?? 'DIURNA')
        .trim()
        .toUpperCase(),
      codigoVariable,
      valor,
    })
  })

  if (rows.length === 0) {
    throw new VariableFileParseError('El archivo no contiene filas de datos válidas.')
  }

  return { rows, omitidas }
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer)
}
