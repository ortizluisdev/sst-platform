import { resolveReportEstado, formatReferenciaNorma } from '../../utils/reportFormatting.js'

interface CsvVariable {
  nombre: string
  simbolo: string | null
  promedio: number
  unidadMedida: string
  limiteMin: number | null
  limiteMax: number | null
  estado: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS'
  tipo: 'MEDICION' | 'CALCULO' | 'INSPECCION' | null
}

interface CsvCategoria {
  categoria: string
  variables: CsvVariable[]
}

const TIPO_LABEL: Record<'MEDICION' | 'CALCULO' | 'INSPECCION', string> = { MEDICION: 'M', CALCULO: 'C', INSPECCION: 'I' }

function escapeCsv(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/** CSV plano de "Reporte Hoja 2" — solo valores calculados, sin fórmulas ni
 * estilos (ver spec aprobada: "PARA CSV: solo exporta Reporte Hoja 2"). */
export function buildReporteHoja2Csv(categories: CsvCategoria[]): string {
  const headers = ['Agente', 'Variable', 'Símbolo', 'Resultado', 'Unidad', 'Referencia/Norma', 'Tipo', 'Estado']
  const rows: string[] = [headers.join(',')]

  for (const categoria of categories) {
    for (const v of categoria.variables) {
      rows.push(
        [
          categoria.categoria,
          v.nombre,
          v.simbolo ?? '—',
          v.promedio,
          v.unidadMedida,
          formatReferenciaNorma(v.limiteMin, v.limiteMax, v.unidadMedida),
          v.tipo ? TIPO_LABEL[v.tipo] : '—',
          resolveReportEstado(v),
        ]
          .map(escapeCsv)
          .join(','),
      )
    }
  }

  // BOM UTF-8: mismo patrón ya usado en el CSV client-side existente
  // (ClientDashboardTab.vue) — sin esto Excel abre acentos rotos en Windows.
  return '﻿' + rows.join('\r\n')
}
