import {
  COLORS,
  MARGIN,
  PAGE_WIDTH,
  newDocument,
  drawTitle,
  drawSectionHeader,
  drawLabelValueRow,
  drawTable,
  drawFootnote,
  drawKpiCard,
  drawComplianceRing,
  drawSignatureBlock,
} from './reports.pdfStyles.js'
import { impactoFromPrioridad } from '../../utils/reportFormatting.js'

export interface ReporteHoja1FilaAgente {
  agente: string
  variableClave: string
  resultado: number
  limite: number | null
  sentido: 'min' | 'max' | null
  estado: string
}

export interface ReporteHoja1Hallazgo {
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  descripcion: string
  variable: string
  estado: string
}

export interface ReporteHoja1Recomendacion {
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  recomendacion: string
}

export interface ReporteHoja1Data {
  empresa: string
  nit: string
  direccion: string
  ciudad: string
  sede: string
  area: string
  periodoEvaluacion: string
  numeroInforme: string
  contacto: string
  cargo: string
  elaboradoPor: string
  firmaBase64: string | null
  clienteNombre: string
  clienteCargo: string | null
  clienteFirmaBase64: string | null
  clienteFotoBase64: string | null
  fechaEvaluacion: string
  fechaEmision: string
  igho: number
  cumplimientoPct: number
  nivelRiesgo: string
  noConformidades: number
  totalMediciones: number
  puestosEvaluados: number
  filasAgente: ReporteHoja1FilaAgente[]
  hallazgos: ReporteHoja1Hallazgo[]
  recomendaciones: ReporteHoja1Recomendacion[]
}

/**
 * "Reporte Hoja 1" — informe básico de una página, estructura y textos
 * replicados literalmente de backend/templates/variablesdash1.xlsx (hoja
 * "Reporte Hoja 1") — no rediseñado, ver spec aprobada.
 */
export function renderReporteHoja1Pdf(data: ReporteHoja1Data): Promise<Buffer> {
  const doc = newDocument()
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  let y = MARGIN
  y = drawTitle(doc, `Informe de higiene ocupacional — ${data.empresa}`, 'Mediciones higiénicas · Reporte básico (Hoja 1) · RoMa Applied Science', y)

  y = drawSectionHeader(doc, 'Datos del cliente', y)
  y = drawLabelValueRow(doc, [
    ['Empresa / Razón social', data.empresa],
    ['NIT', data.nit],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Dirección', data.direccion],
    ['Ciudad', data.ciudad],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Contacto / representante', data.contacto],
    ['Cargo', data.cargo],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Sede', data.sede],
    ['Área', data.area],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Periodo de evaluación', data.periodoEvaluacion],
    ['Fecha', data.fechaEvaluacion],
  ], y)
  y = drawLabelValueRow(doc, [
    ['Elaborado por', data.elaboradoPor],
    ['N° informe', data.numeroInforme],
  ], y)

  y += 3
  y = drawSectionHeader(doc, 'Resumen ejecutivo', y)
  {
    // Anillo de cumplimiento a la izquierda (mismo lenguaje visual que
    // ComplianceRing.vue del dashboard) + 4 tarjetas KPI a la derecha —
    // reemplaza las filas de texto plano por algo escaneable de un vistazo,
    // igual que en el dashboard web.
    const ringRadius = 32
    const ringCenterX = MARGIN + ringRadius + 4
    const ringCenterY = y + ringRadius + 6
    const ringColor = data.cumplimientoPct >= 80 ? '#1E7B4D' : data.cumplimientoPct >= 50 ? '#B45309' : '#B91C1C'
    drawComplianceRing(doc, ringCenterX, ringCenterY, ringRadius, data.cumplimientoPct, ringColor)
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(COLORS.subtitulo)
      .text('CUMPLIMIENTO', MARGIN, ringCenterY + ringRadius + 8, { width: ringRadius * 2 + 8, align: 'center' })

    const cardsX = MARGIN + ringRadius * 2 + 20
    const cardsWidth = PAGE_WIDTH - (ringRadius * 2 + 20)
    const cardGap = 6
    const cardWidth = (cardsWidth - cardGap) / 2
    let cardY = y
    cardY = Math.max(
      drawKpiCard(doc, cardsX, cardY, cardWidth, 'Índice global de higiene', `${data.igho} /100`, '#1F3A5F'),
      cardY,
    )
    drawKpiCard(doc, cardsX + cardWidth + cardGap, y, cardWidth, 'Nivel de riesgo global', data.nivelRiesgo, '#B45309')
    cardY += cardGap
    drawKpiCard(doc, cardsX, cardY, cardWidth, 'No conformidades', String(data.noConformidades), '#B91C1C')
    cardY = drawKpiCard(doc, cardsX + cardWidth + cardGap, cardY, cardWidth, 'Total de mediciones', String(data.totalMediciones), '#4A6785')

    y = Math.max(ringCenterY + ringRadius + 22, cardY) + 4
    y = drawLabelValueRow(doc, [['Puestos evaluados', String(data.puestosEvaluados)]], y)
  }

  y += 3
  y = drawSectionHeader(doc, 'Resultados por agente vs. norma', y)
  y = drawTable(
    doc,
    [
      { header: 'Agente', width: 90 },
      { header: 'Variable clave (unidad)', width: 160 },
      { header: 'Resultado', width: 70, align: 'right' },
      { header: 'Límite', width: 60, align: 'right' },
      { header: 'Sentido', width: 55, align: 'center' },
      { header: 'Estado', width: PAGE_WIDTH - 90 - 160 - 70 - 60 - 55, align: 'center', chip: true },
    ],
    data.filasAgente.map((f) => [
      f.agente,
      f.variableClave,
      String(f.resultado),
      f.limite != null ? String(f.limite) : '—',
      f.sentido ?? '—',
      f.estado,
    ]),
    y,
  )

  y += 3
  y = drawSectionHeader(doc, 'Hallazgos / no conformidades principales', y)
  if (data.hallazgos.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.texto).text('Sin hallazgos abiertos en el periodo.', MARGIN, y)
    y = doc.y + 10
  } else {
    y = drawTable(
      doc,
      [
        { header: 'Prioridad', width: 70 },
        { header: 'Descripción', width: PAGE_WIDTH - 70 - 120 - 100 },
        { header: 'Variable', width: 120 },
        { header: 'Estado', width: 100, align: 'center', chip: true },
      ],
      data.hallazgos.map((h) => [PRIORIDAD_LABEL[h.prioridad], h.descripcion, h.variable, ESTADO_LABEL[h.estado] ?? h.estado]),
      y,
    )
  }

  y += 3
  y = drawSectionHeader(doc, 'Recomendaciones principales', y)
  if (data.recomendaciones.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.texto).text('Sin recomendaciones activas en el periodo.', MARGIN, y)
    y = doc.y + 10
  } else {
    y = drawTable(
      doc,
      [
        { header: 'Prioridad', width: 90 },
        { header: 'Recomendación', width: PAGE_WIDTH - 90 - 100 },
        { header: 'Impacto', width: 100, align: 'center' },
      ],
      data.recomendaciones.map((r) => [PRIORIDAD_LABEL[r.prioridad], r.recomendacion, impactoFromPrioridad(r.prioridad)]),
      y,
    )
  }

  y += 3
  y = drawSectionHeader(doc, 'Responsable', y)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.texto).text('Elaborado por: ', MARGIN, y, { continued: true })
  doc.font('Helvetica').text(data.elaboradoPor)
  doc.font('Helvetica-Bold').text('Fecha de emisión: ', MARGIN, doc.y + 4, { continued: true })
  doc.font('Helvetica').text(data.fechaEmision)
  y = doc.y + 6

  // Dos firmas obligatorias, una junto a la otra para no consumir el doble
  // de alto de página: RoMa (Super-Admin, quien elabora el informe) y el
  // cliente (quien lo genera desde su propio dashboard) — ver spec de
  // doble firma aprobada.
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
    'Nota: el estado (Cumple / No cumple) se calcula solo al comparar el resultado con el límite. Los límites son de referencia; deben confirmarse contra la normativa vigente por país, sector y tarea.',
    y,
  )

  doc.end()
  return done
}

const PRIORIDAD_LABEL: Record<'ALTA' | 'MEDIA' | 'BAJA', string> = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' }
const ESTADO_LABEL: Record<string, string> = { ABIERTA: 'Abierta', EN_SEGUIMIENTO: 'En seguimiento', CERRADA: 'Cerrada' }
