/** Descarga un arreglo de filas como archivo CSV — mismo patrón que
 * `exportCsv()` en ReportesTab.vue (BOM + comillas escapadas + Blob),
 * extraído a un util compartido para los botones "Descargar CSV" de
 * Vehículos y Personas (Seguridad Vial). No reemplaza el `exportCsv()` de
 * ReportesTab.vue (Higiene Industrial) para no tocar código ya probado de
 * un servicio distinto — mismo criterio de "no romper lo que funciona". */
function escapeCsvValue(value: string | number): string {
  const str = String(value)
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(';'))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
