import { isAxiosError } from 'axios'
import { apiClient } from './api'

/** Metadatos por-reporte — nunca persistidos, se piden cada vez que se
 * genera un reporte (ver decisión de arquitectura: no mezclar datos
 * permanentes de la organización con metadatos de un documento puntual). */
export interface ReportMetadata {
  direccion?: string
  ciudad?: string
  sede?: string
  area?: string
  periodoEvaluacion?: string
  numeroInforme?: string
  elaboradoPor?: string
}

export class ReportRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ReportRequestError'
    this.status = status
  }
}

async function rethrow(err: unknown): Promise<never> {
  if (isAxiosError(err) && err.response) {
    // responseType: 'blob' hace que el CUERPO del error también llegue como
    // Blob, no como JSON parseado — hay que leerlo como texto primero.
    let message = 'Ocurrió un error al generar el reporte'
    const data = err.response.data
    try {
      const text = data instanceof Blob ? await data.text() : JSON.stringify(data)
      const parsed = JSON.parse(text)
      message = parsed.message ?? Object.values(parsed.errors ?? {})[0] ?? message
    } catch {
      // Cuerpo no-JSON — se queda con el mensaje genérico.
    }
    throw new ReportRequestError(err.response.status, message)
  }
  throw err
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

interface ReportScope {
  serviceSlug: string
  /** Presente solo en uso admin — el cliente nunca lo pasa (org derivada de
   * la sesión en el backend). */
  organizationId?: string
  uploadId?: string
}

function basePath(scope: ReportScope): string {
  return scope.organizationId
    ? `/admin/organizations/${scope.organizationId}/dashboard/${scope.serviceSlug}`
    : `/dashboard/${scope.serviceSlug}`
}

export async function generateReportPdf(
  scope: ReportScope,
  tipo: 'basico' | 'tecnico',
  metadata: ReportMetadata,
): Promise<void> {
  try {
    const response = await apiClient.post(
      `${basePath(scope)}/reports/pdf`,
      { tipo, uploadId: scope.uploadId, metadata },
      { responseType: 'blob' },
    )
    downloadBlob(response.data, `reporte-${tipo}-${scope.serviceSlug}.pdf`)
  } catch (err) {
    await rethrow(err)
  }
}

export async function generateReportCsv(scope: ReportScope): Promise<void> {
  try {
    const response = await apiClient.post(
      `${basePath(scope)}/reports/csv`,
      { uploadId: scope.uploadId },
      { responseType: 'blob' },
    )
    downloadBlob(response.data, `reporte-tecnico-${scope.serviceSlug}.csv`)
  } catch (err) {
    await rethrow(err)
  }
}
