import type ExcelJS from 'exceljs'

export interface ReportWorkbookRow {
  codigoVariable: string
  valor: number
}

export interface ReportWorkbookOmittedRow {
  nombre: string
  motivo: 'sin_variable_equivalente' | 'valor_no_numerico'
}

export interface ReportWorkbookParseResult {
  empresa: string | null
  rows: ReportWorkbookRow[]
  omitidas: ReportWorkbookOmittedRow[]
}

const CATEGORIAS = ['Iluminación', 'Sonido', 'Estrés térmico', 'Radiación UV', 'Vibración'] as const

/** Alias: nombre tal como aparece en "Reporte Hoja 2" → código real del
 * catálogo, para los casos donde el texto no coincide exacto (ver spec
 * 2026-07-30-report-workbook-import-design.md, tabla de equivalencias).
 * Todo lo que no está aquí se busca en NOMBRE_EXACTO_POR_CATEGORIA. */
const ALIAS_POR_CATEGORIA: Record<string, Record<string, string>> = {
  Iluminación: {
    'Deslumbramiento unificado': 'ILU-03',
    'Luminancia superficie': 'ILU-11',
    'Reflectancia pared (vertical)': 'ILU-09',
    'Iluminancia vertical 0.0 m': 'ILU-14',
    'Iluminancia vertical 1.0 m': 'ILU-15',
    'Iluminancia vertical 1.5 m': 'ILU-16',
  },
  Sonido: {
    'Nivel pico (C)': 'RUI-02',
    'Atenuación de protector': 'RUI-10',
    'Percentil L10': 'RUI-11',
    'Percentil L50': 'RUI-12',
    'Percentil L90': 'RUI-13',
  },
  'Estrés térmico': {
    'Temperatura del aire': 'TER-01',
    'Bulbo húmedo natural': 'TER-06',
    'Voto medio previsto': 'TER-04',
    Insatisfechos: 'TER-09',
  },
  'Radiación UV': {},
  Vibración: {
    'Exposición diaria mano-brazo': 'VIB-06',
    'Exposición diaria cuerpo entero': 'VIB-08',
    'Valor de dosis de vibración': 'VIB-09',
  },
}

/** Filas cuyo "Resultado" trae 2 valores separados por "/" (ej. "45/15"),
 * que corresponden a 2 códigos de catálogo distintos, en el mismo orden.
 * Se resuelven ANTES que ALIAS_POR_CATEGORIA/NOMBRE_EXACTO_POR_CATEGORIA —
 * son un caso especial, no un simple nombre→código 1 a 1. */
const MULTI_VALOR_POR_CATEGORIA: Record<string, Record<string, [string, string]>> = {
  'Estrés térmico': {
    'Régimen trabajo/descanso': ['TER-13', 'TER-14'],
  },
}

/** Nombre exacto de "Reporte Hoja 2" → código de catálogo, por categoría
 * (coinciden tal cual, sin necesitar alias). */
const NOMBRE_EXACTO_POR_CATEGORIA: Record<string, Record<string, string>> = {
  Iluminación: {
    'Iluminancia horizontal media': 'ILU-01',
    Uniformidad: 'ILU-02',
    'Reflectancia piso': 'ILU-08',
    'Reflectancia techo': 'ILU-10',
    'Iluminancia cilíndrica': 'ILU-07',
  },
  Sonido: {
    'Nivel continuo equivalente (A)': 'RUI-05',
    'Nivel de exposición diaria': 'RUI-06',
    'Dosis de ruido': 'RUI-04',
    'Tiempo de exposición': 'RUI-03',
  },
  'Estrés térmico': {
    'Temperatura de globo': 'TER-05',
    'Velocidad del aire': 'TER-08',
    'Humedad relativa': 'TER-02',
    'Temperatura radiante media': 'TER-07',
    'Índice WBGT': 'TER-03',
    'Tasa metabólica': 'TER-10',
    'Aislamiento de vestimenta': 'TER-11',
  },
  'Radiación UV': {
    'Irradiancia efectiva': 'RUV-02',
    'Exposición radiante efectiva': 'RUV-03',
    'Índice UV': 'RUV-01',
    'Tiempo máximo de exposición': 'RUV-04',
  },
  Vibración: {
    'Aceleración ponderada mano-brazo': 'VIB-05',
    'Aceleración ponderada cuerpo entero': 'VIB-07',
    'Frecuencia dominante': 'VIB-03',
    'Tiempo de exposición': 'VIB-04',
  },
}

/**
 * Lee la hoja "Reporte Hoja 2" de un workbook ya cargado. No lanza error
 * si hay filas sin variable equivalente o con resultado no numérico — se
 * reportan en `omitidas`, nunca bloquean el resto de la carga (el
 * objetivo es que el archivo real del cliente siempre se pueda subir).
 */
export function parseVariableReportWorkbook(workbook: ExcelJS.Workbook): ReportWorkbookParseResult {
  const empresa = readEmpresa(workbook)
  const hoja2 = workbook.getWorksheet('Reporte Hoja 2')
  if (!hoja2) {
    throw new Error('El archivo no contiene la hoja "Reporte Hoja 2".')
  }

  const rows: ReportWorkbookRow[] = []
  const omitidas: ReportWorkbookOmittedRow[] = []
  let categoriaActual: string | null = null
  let esFilaDeEncabezado = false
  let terminado = false

  // includeEmpty: true — sin esto, ExcelJS salta por completo la fila en
  // blanco que separa los datos de la leyenda final (fila 64 en el archivo
  // real), y el "if (!nombre) terminado = true" de abajo nunca se dispara
  // a tiempo, dejando que las 2 filas de leyenda se lean como si fueran
  // datos (confirmado: sin esta opción, eachRow salta de la fila 63 a la
  // 65 directamente).
  hoja2.eachRow({ includeEmpty: true }, (row) => {
    if (terminado) return
    const primeraCelda = String(row.getCell(1).value ?? '').trim()

    if ((CATEGORIAS as readonly string[]).includes(primeraCelda)) {
      categoriaActual = primeraCelda
      esFilaDeEncabezado = true // la próxima fila es "Variable/Símbolo/.../Estado", se salta
      return
    }
    if (esFilaDeEncabezado) {
      esFilaDeEncabezado = false
      return
    }
    if (!categoriaActual) return // filas de título/metadata antes de la primera categoría

    const nombre = primeraCelda
    if (!nombre) {
      terminado = true // fila en blanco = fin de la tabla de datos (antes de la leyenda)
      return
    }

    const resultadoRaw = row.getCell(3).value
    const resultadoTexto = typeof resultadoRaw === 'number' ? String(resultadoRaw) : String(resultadoRaw ?? '').trim()

    const multiValor = MULTI_VALOR_POR_CATEGORIA[categoriaActual]?.[nombre]
    if (multiValor) {
      const partes = resultadoTexto.split('/').map((p) => Number(p.trim()))
      if (partes.length !== multiValor.length || partes.some((p) => Number.isNaN(p))) {
        omitidas.push({ nombre, motivo: 'valor_no_numerico' })
        return
      }
      partes.forEach((valor, i) => rows.push({ codigoVariable: multiValor[i]!, valor }))
      return
    }

    const valor = typeof resultadoRaw === 'number' ? resultadoRaw : Number(resultadoTexto)

    // El valor no numérico ("perfil", texto libre, etc.) es la causa más
    // fundamental de omisión — se reporta primero, sin importar si existe
    // o no un código de catálogo para el nombre (evita el mensaje engañoso
    // "sin variable equivalente" cuando el problema real es que el dato no
    // se puede interpretar como número).
    if (Number.isNaN(valor)) {
      omitidas.push({ nombre, motivo: 'valor_no_numerico' })
      return
    }

    const codigo = ALIAS_POR_CATEGORIA[categoriaActual]?.[nombre] ?? NOMBRE_EXACTO_POR_CATEGORIA[categoriaActual]?.[nombre]

    if (!codigo) {
      omitidas.push({ nombre, motivo: 'sin_variable_equivalente' })
      return
    }

    rows.push({ codigoVariable: codigo, valor })
  })

  return { empresa, rows, omitidas }
}

function readEmpresa(workbook: ExcelJS.Workbook): string | null {
  const hoja1 = workbook.getWorksheet('Reporte Hoja 1')
  if (!hoja1) return null
  const valor = hoja1.getCell('B5').value
  const texto = String(valor ?? '').trim()
  return texto.length > 0 ? texto : null
}
