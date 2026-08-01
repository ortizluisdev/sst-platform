import {
  MARGIN,
  PAGE_WIDTH,
  newDocument,
  drawTitle,
  drawSectionHeader,
  drawLabelValueRow,
  drawTable,
  drawFootnote,
  drawSignatureBlock,
} from './reports.pdfStyles.js'
import { resolveReportEstado, formatReferenciaNorma } from '../../utils/reportFormatting.js'

interface ReporteHoja2Variable {
  nombre: string
  simbolo: string | null
  promedio: number
  unidadMedida: string
  limiteMin: number | null
  limiteMax: number | null
  tipo: 'MEDICION' | 'CALCULO' | 'INSPECCION' | null
  estado: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS'
}

interface ReporteHoja2Categoria {
  categoria: string
  variables: ReporteHoja2Variable[]
}

export interface ReporteHoja2Data {
  empresa: string
  sede: string
  periodoEvaluacion: string
  numeroInforme: string
  elaboradoPor: string
  firmaBase64: string | null
  clienteNombre: string
  clienteCargo: string | null
  clienteFirmaBase64: string | null
  clienteFotoBase64: string | null
  fechaEmision: string
  categories: ReporteHoja2Categoria[]
}

const TIPO_LABEL: Record<'MEDICION' | 'CALCULO' | 'INSPECCION', string> = { MEDICION: 'M', CALCULO: 'C', INSPECCION: 'I' }

/**
 * "Reporte Hoja 2" — anexo técnico avanzado, una sección por agente, misma
 * estructura y textos de backend/templates/variablesdash1.xlsx (hoja
 * "Reporte Hoja 2"). El Estado se calcula desde comparisonType/limiteMin/
 * limiteMax reales (resolveReportEstado), nunca parseando el texto de
 * "Referencia/norma" — ver disclaimer en reportFormatting.ts.
 */
export function renderReporteHoja2Pdf(data: ReporteHoja2Data): Promise<Buffer> {
  const doc = newDocument()
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  let y = MARGIN
  y = drawTitle(doc, `Anexo técnico de mediciones — ${data.empresa}`, 'Mediciones higiénicas · Reporte avanzado (Hoja 2) · variables técnicas por agente', y)

  y = drawSectionHeader(doc, 'Datos del cliente (tomados del Reporte Hoja 1)', y)
  y = drawLabelValueRow(doc, [
    ['Empresa', data.empresa],
    ['Sede', data.sede],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Periodo', data.periodoEvaluacion],
    ['N° informe', data.numeroInforme],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Elaborado por', data.elaboradoPor],
    ['Fecha', data.fechaEmision],
  ], y)

  y += 6

  const columns = [
    { header: 'Variable', width: 125 },
    { header: 'Símbolo', width: 55, align: 'center' as const },
    { header: 'Resultado', width: 65, align: 'right' as const },
    { header: 'Unidad', width: 50, align: 'center' as const },
    { header: 'Referencia/norma', width: 100, align: 'center' as const },
    { header: 'Tipo', width: 35, align: 'center' as const },
    { header: 'Estado', width: PAGE_WIDTH - 125 - 55 - 65 - 50 - 100 - 35, align: 'center' as const, chip: true },
  ]

  for (const categoria of data.categories) {
    if (categoria.variables.length === 0) continue

    if (y + 60 > doc.page.height - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    y = drawSectionHeader(doc, categoria.categoria, y)
    y = drawTable(
      doc,
      columns,
      categoria.variables.map((v) => [
        v.nombre,
        v.simbolo ?? '—',
        String(v.promedio),
        v.unidadMedida,
        formatReferenciaNorma(v.limiteMin, v.limiteMax, v.unidadMedida),
        v.tipo ? TIPO_LABEL[v.tipo] : '—',
        resolveReportEstado(v),
      ]),
      y,
    )
    y += 4
  }

  // Mismo bloque de doble firma que Hoja 1 (RoMa + cliente) — el anexo
  // técnico también queda firmado, no solo el resumen ejecutivo.
  if (y + 60 > doc.page.height - MARGIN) {
    doc.addPage()
    y = MARGIN
  }
  y += 4
  y = drawSectionHeader(doc, 'Responsable', y)
  const colWidth = (PAGE_WIDTH - 20) / 2
  const yLeft = drawSignatureBlock(doc, MARGIN, y, colWidth, 'RoMa Applied Science — Firma y sello', data.elaboradoPor, null, data.firmaBase64, null)
  const yRight = drawSignatureBlock(
    doc,
    MARGIN + colWidth + 20,
    y,
    colWidth,
    'Firma cliente',
    data.clienteNombre,
    data.clienteCargo,
    data.clienteFirmaBase64,
    data.clienteFotoBase64,
  )
  y = Math.max(yLeft, yRight) + 4

  drawFootnote(
    doc,
    'Tipo: M medición en campo · C cálculo por fórmula · I inspección. Incertidumbre expandida U (k=2, ~95%) según GUM.',
    y,
  )

  doc.end()
  return done
}
