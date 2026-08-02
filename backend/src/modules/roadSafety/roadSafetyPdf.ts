import {
  COLORS,
  MARGIN,
  PAGE_WIDTH,
  newDocument,
  drawTitle,
  drawSectionHeader,
  drawLabelValueRow,
  drawFootnote,
  drawSignatureBlock,
} from '../reports/reports.pdfStyles.js'

export interface RoadSafetySignerData {
  elaboradoPor: string
  firmaBase64: string | null
  clienteNombre: string
  clienteCargo: string | null
  clienteFirmaBase64: string | null
  clienteFotoBase64: string | null
  fechaEmision: string
}

function drawFirmas(doc: PDFKit.PDFDocument, data: RoadSafetySignerData, y: number): number {
  y = drawSectionHeader(doc, 'Responsable', y)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.texto).text('Elaborado por: ', MARGIN, y, { continued: true })
  doc.font('Helvetica').text(data.elaboradoPor)
  doc.font('Helvetica-Bold').text('Fecha de emisión: ', MARGIN, doc.y + 4, { continued: true })
  doc.font('Helvetica').text(data.fechaEmision)
  y = doc.y + 6

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
  return Math.max(yLeft, yRight) + 4
}

// --- Reporte H1 — Informe general -----------------------------------------

export interface ReporteH1Data extends RoadSafetySignerData {
  empresa: string
  nit: string
  sedePrincipal: string
  ciudad: string
  responsablePesv: string
  fechaCorte: string
  nivelPesv: string
  numeroInforme: string
  cumplimientoGlobal: number | null
  pasosCumplen: number
  pasosParciales: number
  pasosSinCumplir: number
  totalActoresViales: number
  totalVehiculos: number
  ciudadesConOperacion: number
  rutasActivas: number
}

export function renderReporteH1Pdf(data: ReporteH1Data): Promise<Buffer> {
  const doc = newDocument()
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  let y = MARGIN
  y = drawTitle(doc, `Informe general — Cumplimiento PESV e inventario · ${data.empresa}`, 'Reporte de la Hoja 1 · Seguridad Vial (MSSV)', y)

  y = drawSectionHeader(doc, 'Datos del cliente', y)
  y = drawLabelValueRow(doc, [['Empresa', data.empresa], ['NIT', data.nit]], y)
  y = drawLabelValueRow(doc, [['Sede principal', data.sedePrincipal], ['Ciudad', data.ciudad]], y)
  y = drawLabelValueRow(doc, [['Responsable PESV', data.responsablePesv], ['Fecha de corte', data.fechaCorte]], y)
  y = drawLabelValueRow(doc, [['Nivel PESV', data.nivelPesv], ['N° informe', data.numeroInforme]], y)

  y += 3
  y = drawSectionHeader(doc, 'Cumplimiento PESV (24 pasos)', y)
  y = drawLabelValueRow(
    doc,
    [
      ['% cumplimiento global', data.cumplimientoGlobal != null ? `${data.cumplimientoGlobal}%` : '—'],
      ['Pasos que cumplen', String(data.pasosCumplen)],
    ],
    y,
  )
  y = drawLabelValueRow(doc, [['Pasos parciales', String(data.pasosParciales)], ['Pasos sin cumplir', String(data.pasosSinCumplir)]], y)

  y += 3
  y = drawSectionHeader(doc, 'Inventario de movilidad', y)
  y = drawLabelValueRow(
    doc,
    [['Total actores viales', String(data.totalActoresViales)], ['Total vehículos', String(data.totalVehiculos)]],
    y,
  )
  y = drawLabelValueRow(
    doc,
    [['Ciudades con operación', String(data.ciudadesConOperacion)], ['Rutas activas', String(data.rutasActivas)]],
    y,
  )

  y += 3
  y = drawFirmas(doc, data, y)
  drawFootnote(doc, 'Informe calculado automáticamente desde la Hoja 1 · Generalidad — no es de digitación manual.', y)

  doc.end()
  return done
}

// --- Reporte H2 — Informe de flota -----------------------------------------

export interface ReporteH2Data extends RoadSafetySignerData {
  empresa: string
  fechaCorte: string
  totalVehiculos: number
  conAlerta: number
  soatPorVencer: number
  rtmPorVencer: number
  documentosVencidos: number
  conComparendos: number
}

export function renderReporteH2Pdf(data: ReporteH2Data): Promise<Buffer> {
  const doc = newDocument()
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  let y = MARGIN
  y = drawTitle(doc, `Informe de flota — Vehículos, mantenimiento y alertas · ${data.empresa}`, 'Reporte de la Hoja 2 · Seguridad Vial (MSSV)', y)

  y = drawSectionHeader(doc, 'Datos del cliente', y)
  y = drawLabelValueRow(doc, [['Empresa', data.empresa], ['Fecha de corte', data.fechaCorte]], y)

  y += 3
  y = drawSectionHeader(doc, 'Estado de la flota', y)
  y = drawLabelValueRow(doc, [['Total de vehículos', String(data.totalVehiculos)], ['Con alerta', String(data.conAlerta)]], y)
  y = drawLabelValueRow(
    doc,
    [['SOAT por vencer (<=30 d)', String(data.soatPorVencer)], ['RTM por vencer (<=30 d)', String(data.rtmPorVencer)]],
    y,
  )
  y = drawLabelValueRow(
    doc,
    [['Documentos vencidos', String(data.documentosVencidos)], ['Con comparendos', String(data.conComparendos)]],
    y,
  )

  y += 3
  y = drawFirmas(doc, data, y)
  drawFootnote(doc, 'Estado calculado automáticamente desde la Hoja 2 · Vehículos — Alerta según vencimientos, comparendos, mantenimiento y consumo.', y)

  doc.end()
  return done
}

// --- Reporte H3 — Informe de personas ---------------------------------------

export interface ReporteH3Data extends RoadSafetySignerData {
  empresa: string
  fechaCorte: string
  totalConductores: number
  pctAprobados: number | null
  iccPromedio: number | null
  noAprobados: number
  licenciasPorVencer: number
  licenciasVencidas: number
}

export function renderReporteH3Pdf(data: ReporteH3Data): Promise<Buffer> {
  const doc = newDocument()
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  let y = MARGIN
  y = drawTitle(doc, `Informe de personas — Competencias y formación · ${data.empresa}`, 'Reporte de la Hoja 3 · Seguridad Vial (MSSV)', y)

  y = drawSectionHeader(doc, 'Datos del cliente', y)
  y = drawLabelValueRow(doc, [['Empresa', data.empresa], ['Fecha de corte', data.fechaCorte]], y)

  y += 3
  y = drawSectionHeader(doc, 'Competencias del actor vial', y)
  y = drawLabelValueRow(
    doc,
    [
      ['Total de conductores', String(data.totalConductores)],
      ['% aprobados (ICC>=70)', data.pctAprobados != null ? `${data.pctAprobados}%` : '—'],
    ],
    y,
  )
  y = drawLabelValueRow(
    doc,
    [['ICC promedio de la flota', data.iccPromedio != null ? String(data.iccPromedio) : '—'], ['No aprobados', String(data.noAprobados)]],
    y,
  )
  y = drawLabelValueRow(
    doc,
    [['Licencias por vencer (<=30 d)', String(data.licenciasPorVencer)], ['Licencias vencidas', String(data.licenciasVencidas)]],
    y,
  )

  y += 3
  y = drawFirmas(doc, data, y)
  drawFootnote(doc, 'ICC = promedio de las 9 evaluaciones cognitivas · Aprobado si ICC >= 70. Calculado automáticamente desde la Hoja 3 · Personas.', y)

  doc.end()
  return done
}

// --- Reporte H4 — Informe de rutograma --------------------------------------

export interface ReporteH4Data extends RoadSafetySignerData {
  empresa: string
  fechaCorte: string
  ruta: string
  distancia: string
  condicionesMarcadas: number
  puntosAnalizados: number
}

export function renderReporteH4Pdf(data: ReporteH4Data): Promise<Buffer> {
  const doc = newDocument()
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  let y = MARGIN
  y = drawTitle(doc, `Informe de rutograma — Riesgo de ruta · ${data.empresa}`, 'Reporte de la Hoja 4 · Seguridad Vial (MSSV)', y)

  y = drawSectionHeader(doc, 'Datos del cliente', y)
  y = drawLabelValueRow(doc, [['Empresa', data.empresa], ['Fecha de corte', data.fechaCorte]], y)

  y += 3
  y = drawSectionHeader(doc, 'Riesgo de la ruta analizada', y)
  y = drawLabelValueRow(doc, [['Ruta', data.ruta], ['Distancia', data.distancia]], y)
  y = drawLabelValueRow(
    doc,
    [['Condiciones de riesgo marcadas', String(data.condicionesMarcadas)], ['Puntos analizados', String(data.puntosAnalizados)]],
    y,
  )

  y += 3
  y = drawFirmas(doc, data, y)
  drawFootnote(doc, 'Detalle completo (organismos de apoyo, puntos de la ruta) disponible en la Hoja 4 · Rutograma del dashboard.', y)

  doc.end()
  return done
}
