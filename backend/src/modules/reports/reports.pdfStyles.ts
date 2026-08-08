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

/** Colores de los chips de estado — mismo vocabulario que resolveReportEstado/
 * calculateHoja1Estado en reportFormatting.ts ('Cumple' | 'No cumple' |
 * 'Informativo' | '—'), mismo lenguaje visual semáforo que el resto de la
 * app (ver semaphoreStyles.ts en frontend: verde/rojo/azul/gris). */
const CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  Cumple: { bg: '#DCFCE7', fg: '#166534' },
  'No cumple': { bg: '#FEE2E2', fg: '#991B1B' },
  Informativo: { bg: '#DBEAFE', fg: '#1E40AF' },
  '—': { bg: '#F3F4F6', fg: '#6B7280' },
  Abierta: { bg: '#FEE2E2', fg: '#991B1B' },
  'En seguimiento': { bg: '#FEF3C7', fg: '#92400E' },
  Cerrada: { bg: '#DCFCE7', fg: '#166534' },
}

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
  /** Renderiza el valor de esta columna como una píldora de color en vez de
   * texto plano — usado en columnas "Estado" (ver CHIP_COLORS). El texto de
   * la celda debe ser exactamente una de las claves de CHIP_COLORS; si no
   * matchea ninguna, se dibuja en gris neutro. */
  chip?: boolean
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
      const cellText = row[colIndex] ?? ''
      if (col.chip) {
        drawChip(doc, cellText, x, y, col.width, rowHeight)
      } else {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.texto)
          .text(cellText, x + CELL_PAD_X, y + CELL_PAD_Y, { width: col.width - CELL_PAD_X * 2, align: col.align ?? 'left' })
      }
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

/** Píldora de color centrada dentro de una celda de tabla — ver CHIP_COLORS. */
function drawChip(doc: PDFKit.PDFDocument, texto: string, x: number, y: number, width: number, rowHeight: number): void {
  const colors = CHIP_COLORS[texto] ?? { bg: '#F3F4F6', fg: '#6B7280' }
  const chipHeight = 14
  doc.font('Helvetica-Bold').fontSize(7.5)
  const chipWidth = Math.min(width - CELL_PAD_X * 2, doc.widthOfString(texto.toUpperCase()) + 14)
  const chipX = x + (width - chipWidth) / 2
  const chipY = y + (rowHeight - chipHeight) / 2
  doc.roundedRect(chipX, chipY, chipWidth, chipHeight, chipHeight / 2).fill(colors.bg)
  doc.fillColor(colors.fg).text(texto.toUpperCase(), chipX, chipY + 3.5, { width: chipWidth, align: 'center' })
}

/** Tarjeta KPI con acento de color a la izquierda — mismo lenguaje visual
 * que SummaryCard.vue/ClientStatCard.vue del dashboard web, para que el PDF
 * no se sienta como un documento aparte del resto de la app. */
export function drawKpiCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accentColor: string,
): number {
  const height = 46
  doc.roundedRect(x, y, width, height, 4).fill('#F7F7F5')
  doc.rect(x, y, 3, height).fill(accentColor)
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor(COLORS.subtitulo)
    .text(label.toUpperCase(), x + 10, y + 8, { width: width - 16 })
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.texto).text(value, x + 10, y + 20, { width: width - 16 })
  return y + height
}

/** Dibuja una firma (imagen si existe, si no línea en blanco) + foto de
 * perfil opcional (esquina superior derecha) + nombre + cargo opcional +
 * etiqueta, dentro de una columna de ancho fijo. Devuelve el `y` final para
 * que el llamador tome el máximo entre columnas (usado en Hoja 1 y Hoja 2
 * para el mismo bloque "RoMa / cliente" lado a lado). */
export function drawSignatureBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  yTop: number,
  width: number,
  label: string,
  nombre: string,
  cargo: string | null,
  firmaBase64: string | null,
  fotoBase64: string | null,
): number {
  let y = yTop

  if (fotoBase64) {
    try {
      const fotoPayload = fotoBase64.split(',')[1] ?? ''
      const size = 28
      doc.save()
      doc.roundedRect(x + width - size, y, size, size, 5).clip()
      doc.image(Buffer.from(fotoPayload, 'base64'), x + width - size, y, { width: size, height: size })
      doc.restore()
    } catch (err) {
      // Imagen inválida — no bloquea el resto del reporte, pero queda
      // logueado para poder diagnosticar un PDF con foto faltante.
      console.warn('[reports] foto inválida al generar firma de reporte:', err)
    }
  }

  if (firmaBase64) {
    try {
      const base64Payload = firmaBase64.split(',')[1] ?? ''
      doc.image(Buffer.from(base64Payload, 'base64'), x, y, { fit: [110, 26] })
      y += 28
    } catch (err) {
      // Imagen inválida — no bloquea el resto del reporte, se cae al
      // patrón de línea en blanco de abajo. Queda logueado para diagnóstico.
      console.warn('[reports] firma inválida al generar firma de reporte:', err)
      y += 5
    }
  }

  doc.moveTo(x, y).lineTo(x + Math.min(width, 220), y).strokeColor(COLORS.texto).lineWidth(0.75).stroke()
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.texto).text(nombre, x, y + 4, { width })
  if (cargo) doc.font('Helvetica').fontSize(8).fillColor(COLORS.subtitulo).text(cargo, x, doc.y, { width })
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.subtitulo).text(label, x, doc.y, { width })
  return doc.y
}

/** Anillo de cumplimiento (dona coloreada según el % dado) — mismo lenguaje
 * visual que ComplianceRing.vue del dashboard web. pdfkit no trae un
 * primitivo de arco-por-porcentaje, así que se aproxima con segmentos
 * rectos cortos (60), suficiente resolución para que se vea curvo a 40pt de
 * radio. */
export function drawComplianceRing(
  doc: PDFKit.PDFDocument,
  centerX: number,
  centerY: number,
  radius: number,
  pct: number,
  color: string,
): void {
  const lineWidth = 7
  const segments = 60
  const clampedPct = Math.max(0, Math.min(100, pct))
  const filledSegments = Math.round((clampedPct / 100) * segments)

  doc.lineWidth(lineWidth).lineCap('round')
  for (let i = 0; i < segments; i++) {
    const angleStart = -Math.PI / 2 + (i / segments) * 2 * Math.PI
    const angleEnd = -Math.PI / 2 + ((i + 1) / segments) * 2 * Math.PI
    const x1 = centerX + radius * Math.cos(angleStart)
    const y1 = centerY + radius * Math.sin(angleStart)
    const x2 = centerX + radius * Math.cos(angleEnd)
    const y2 = centerY + radius * Math.sin(angleEnd)
    doc
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .strokeColor(i < filledSegments ? color : '#E5E7EB')
      .stroke()
  }
  doc.lineCap('butt')

  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.texto).text(`${Math.round(clampedPct)}%`, centerX - radius, centerY - 8, {
    width: radius * 2,
    align: 'center',
  })
}
