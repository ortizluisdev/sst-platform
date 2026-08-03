import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { parseVariableReportWorkbook } from './variableReportWorkbookParser.js'

/** Arma un workbook mínimo con "Reporte Hoja 2": una fila de categoría, una
 * fila de encabezado (se salta siempre, cualquier contenido), y las filas
 * de datos que se pasen. Mismo layout que produce el Excel real. */
function buildWorkbook(rowsPorCategoria: Record<string, [nombre: string, resultado: string | number][]>): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const hoja2 = workbook.addWorksheet('Reporte Hoja 2')
  for (const [categoria, filas] of Object.entries(rowsPorCategoria)) {
    hoja2.addRow([categoria])
    hoja2.addRow(['Variable', 'Símbolo', 'Resultado', 'Norma', 'Estado'])
    for (const [nombre, resultado] of filas) {
      hoja2.addRow([nombre, '', resultado])
    }
  }
  return workbook
}

describe('parseVariableReportWorkbook — multi-valor genérico (Fix 2)', () => {
  it('Régimen trabajo/descanso: 1 celda "45/15" → 2 filas (TER-13, TER-14)', () => {
    const wb = buildWorkbook({ 'Estrés térmico': [['Régimen trabajo/descanso', '45/15']] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.omitidas).toEqual([])
    expect(result.rows).toEqual([
      { codigoVariable: 'TER-13', valor: 45 },
      { codigoVariable: 'TER-14', valor: 15 },
    ])
  })

  it('Espectro bandas de octava: 1 celda con 9 valores → 9 filas (RUI-14..RUI-22)', () => {
    const valores = [80, 78, 75, 70, 65, 60, 55, 50, 45]
    const wb = buildWorkbook({ Sonido: [['Espectro bandas de octava', valores.join('/')]] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.omitidas).toEqual([])
    expect(result.rows).toHaveLength(9)
    expect(result.rows.map((r) => r.codigoVariable)).toEqual([
      'RUI-14',
      'RUI-15',
      'RUI-16',
      'RUI-17',
      'RUI-18',
      'RUI-19',
      'RUI-20',
      'RUI-21',
      'RUI-22',
    ])
    expect(result.rows.map((r) => r.valor)).toEqual(valores)
  })

  it('Irradiancia UV-A / UV-B / UV-C: 1 celda con 3 valores → 3 filas (RUV-06/07/08)', () => {
    const wb = buildWorkbook({ 'Radiación UV': [['Irradiancia UV-A / UV-B / UV-C', '1.2/0.8/0.1']] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.omitidas).toEqual([])
    expect(result.rows).toEqual([
      { codigoVariable: 'RUV-06', valor: 1.2 },
      { codigoVariable: 'RUV-07', valor: 0.8 },
      { codigoVariable: 'RUV-08', valor: 0.1 },
    ])
  })

  it('multi-valor con número de partes incorrecto se omite como valor_no_numerico', () => {
    const wb = buildWorkbook({ 'Estrés térmico': [['Régimen trabajo/descanso', '45/15/10']] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.rows).toEqual([])
    expect(result.omitidas).toEqual([{ nombre: 'Régimen trabajo/descanso', motivo: 'valor_no_numerico' }])
  })

  it('multi-valor con una parte no numérica se omite completa', () => {
    const wb = buildWorkbook({ Sonido: [['Espectro bandas de octava', 'perfil']] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.rows).toEqual([])
    expect(result.omitidas).toEqual([{ nombre: 'Espectro bandas de octava', motivo: 'valor_no_numerico' }])
  })
})

describe('parseVariableReportWorkbook — normalización de nombres (Fix 3a)', () => {
  it('mayúsculas distintas igual coinciden', () => {
    const wb = buildWorkbook({ Iluminación: [['ILUMINANCIA HORIZONTAL MEDIA', 480]] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.omitidas).toEqual([])
    expect(result.rows).toEqual([{ codigoVariable: 'ILU-01', valor: 480 }])
  })

  it('sin tilde igual coincide con la clave que sí la tiene', () => {
    const wb = buildWorkbook({ 'Estrés térmico': [['Indice WBGT', 24.5]] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.omitidas).toEqual([])
    expect(result.rows).toEqual([{ codigoVariable: 'TER-03', valor: 24.5 }])
  })

  it('espacios extra/colapsados igual coinciden', () => {
    const wb = buildWorkbook({ Iluminación: [['  Iluminancia   horizontal media ', 480]] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.omitidas).toEqual([])
    expect(result.rows).toEqual([{ codigoVariable: 'ILU-01', valor: 480 }])
  })

  it('nombre sin equivalente (ni con normalización) se omite como sin_variable_equivalente', () => {
    const wb = buildWorkbook({ Iluminación: [['Variable inventada que no existe', 10]] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.rows).toEqual([])
    expect(result.omitidas).toEqual([{ nombre: 'Variable inventada que no existe', motivo: 'sin_variable_equivalente' }])
  })

  it('valor no numérico ("perfil") se omite como valor_no_numerico, no como sin_variable_equivalente', () => {
    const wb = buildWorkbook({ Iluminación: [['Iluminancia horizontal media', 'perfil']] })
    const result = parseVariableReportWorkbook(wb)
    expect(result.rows).toEqual([])
    expect(result.omitidas).toEqual([{ nombre: 'Iluminancia horizontal media', motivo: 'valor_no_numerico' }])
  })
})
