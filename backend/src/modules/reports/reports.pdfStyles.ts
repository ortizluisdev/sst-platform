import PDFDocument from 'pdfkit'

/** Colores extraídos literalmente de backend/templates/variablesdash1.xlsx
 * (hojas "Reporte Hoja 1"/"Reporte Hoja 2") — no inventados, ver hex reales
 * verificados con openpyxl antes de implementar. */
export const COLORS = {
  titulo: '#1F3A5F',
  subtitulo: '#5F5E5A',
  seccionFondo: '#1F3A5F',
  seccionTexto: '#FFFFFF',
  tablaHeaderFondo: '#4A6785',
  tablaHeaderTexto: '#FFFFFF',
  texto: '#2C2C2A',
  valorFondo: '#FFF2CC',
  valorTexto: '#1F4E79',
  nota: '#5F5E5A',
  borde: '#D9D9D9',
} as const

export const MARGIN = 40
export const PAGE_WIDTH = 595.28 - MARGIN * 2 // A4 en puntos, menos márgenes

export function newDocument(): PDFKit.PDFDocument {
  return new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
}

export function drawTitle(doc: PDFKit.PDFDocument, titulo: string, subtitulo: string, y: number): number {
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.titulo).text(titulo, MARGIN, y, { width: PAGE_WIDTH })
  const afterTitulo = doc.y + 2
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.subtitulo).text(subtitulo, MARGIN, afterTitulo, { width: PAGE_WIDTH })
  return doc.y + 12
}

/** Encabezado de sección — fondo #1F3A5F, texto blanco (ej. "Datos del
 * cliente", "Resumen ejecutivo"). */
export function drawSectionHeader(doc: PDFKit.PDFDocument, texto: string, y: number): number {
  const height = 20
  doc.rect(MARGIN, y, PAGE_WIDTH, height).fill(COLORS.seccionFondo)
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COLORS.seccionTexto)
    .text(texto, MARGIN + 8, y + 5, { width: PAGE_WIDTH - 16 })
  return y + height + 6
}

/** Fila de 2 pares etiqueta/valor (ej. "Empresa" | X · "NIT" | Y) — mismo
 * layout de 4 columnas que "Datos del cliente" en la plantilla. */
export function drawLabelValueRow(
  doc: PDFKit.PDFDocument,
  pairs: [string, string][],
  y: number,
): number {
  const colWidth = PAGE_WIDTH / pairs.length
  for (const [i, [label, value]] of pairs.entries()) {
    const x = MARGIN + i * colWidth
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.texto).text(label.toUpperCase(), x, y, { width: colWidth - 10 })
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.texto).text(value, x, y + 11, { width: colWidth - 10 })
  }
  return y + 26
}

export interface TableColumn {
  header: string
  width: number
  align?: 'left' | 'right' | 'center'
}

const CELL_PAD_X = 4
const CELL_PAD_Y = 5
const MIN_ROW_HEIGHT = 18

/** Alto real que necesita un texto dentro de una columna, dado su ancho —
 * pdfkit envuelve el texto solo, pero una altura de fila FIJA no se adapta
 * a eso: un nombre largo de variable ("Iluminancia horizontal media") se
 * solapa con la fila de abajo si la fila no crece con el contenido. */
function measuredHeight(doc: PDFKit.PDFDocument, text: string, width: number): number {
  return doc.heightOfString(text, { width: width - CELL_PAD_X * 2 }) + CELL_PAD_Y * 2
}

/** Tabla genérica — header con fondo #4A6785/texto blanco, filas alternadas
 * (mismo lenguaje visual que el resto de la app, ver ComparisonTable.vue).
 * Alto de fila variable (medido con heightOfString), no fijo — verificado
 * generando PDFs reales con nombres largos antes de dar esto por terminado,
 * la primera versión con alto fijo solapaba texto. */
export function drawTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: string[][],
  y: number,
): number {
  doc.font('Helvetica-Bold').fontSize(8)
  const headerHeight = Math.max(20, ...columns.map((col) => measuredHeight(doc, col.header.toUpperCase(), col.width)))

  doc.rect(MARGIN, y, PAGE_WIDTH, headerHeight).fill(COLORS.tablaHeaderFondo)
  let x = MARGIN
  for (const col of columns) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.tablaHeaderTexto)
      .text(col.header.toUpperCase(), x + CELL_PAD_X, y + CELL_PAD_Y, { width: col.width - CELL_PAD_X * 2, align: col.align ?? 'left' })
    x += col.width
  }
  y += headerHeight

  for (const [rowIndex, row] of rows.entries()) {
    doc.font('Helvetica').fontSize(9)
    const rowHeight = Math.max(MIN_ROW_HEIGHT, ...columns.map((col, i) => measuredHeight(doc, row[i] ?? '', col.width)))

    if (y + rowHeight > doc.page.height - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    if (rowIndex % 2 === 1) doc.rect(MARGIN, y, PAGE_WIDTH, rowHeight).fill('#F7F7F5')

    x = MARGIN
    for (const [colIndex, col] of columns.entries()) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.texto)
        .text(row[colIndex] ?? '', x + CELL_PAD_X, y + CELL_PAD_Y, { width: col.width - CELL_PAD_X * 2, align: col.align ?? 'left' })
      x += col.width
    }
    doc.moveTo(MARGIN, y + rowHeight).lineTo(MARGIN + PAGE_WIDTH, y + rowHeight).strokeColor(COLORS.borde).lineWidth(0.5).stroke()
    y += rowHeight
  }

  return y + 10
}

/** Nota al pie — gris, tamaño menor, siempre visible (no solo en el
 * código) — ver disclaimer de negocio requerido por el usuario. */
export function drawFootnote(doc: PDFKit.PDFDocument, texto: string, y: number): number {
  if (y + 30 > doc.page.height - MARGIN) {
    doc.addPage()
    y = MARGIN
  }
  doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_WIDTH, y).strokeColor(COLORS.borde).lineWidth(0.5).stroke()
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.nota).text(texto, MARGIN, y + 6, { width: PAGE_WIDTH })
  return doc.y + 8
}
