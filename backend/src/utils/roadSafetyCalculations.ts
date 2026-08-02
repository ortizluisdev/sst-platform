/**
 * Réplica exacta de las fórmulas del libro Excel de referencia
 * (registro_seguridad_vial_MSSV_1.xlsx, Hoja 2 y Hoja 3) — verificadas
 * leyendo las fórmulas reales con openpyxl antes de implementar, no
 * inventadas. Ningún resultado de estas funciones se persiste: dependen de
 * "hoy" (=HOY() en Excel), así que se recalculan en cada lectura.
 */

/** Días hasta una fecha (negativo si ya venció) — mismo criterio que
 * `=fecha-HOY()` del Excel. */
export function diasHasta(fecha: Date | null): number | null {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const objetivo = new Date(fecha)
  objetivo.setHours(0, 0, 0, 0)
  return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

/** `=IF(base=0,0,ROUND((base-actual)/base*100,0))` — positivo cuando el
 * rendimiento real está por debajo del rendimiento base (mal indicio). */
export function anomaliaConsumoPct(rendimientoKmGal: number | null, rendimientoBaseKmGal: number | null): number | null {
  if (rendimientoKmGal == null || rendimientoBaseKmGal == null) return null
  if (rendimientoBaseKmGal === 0) return 0
  return Math.round(((rendimientoBaseKmGal - rendimientoKmGal) / rendimientoBaseKmGal) * 100)
}

export type VehicleAlertState = 'OK' | 'ALERTA' | 'VENCIDO'

/**
 * `=IF(OR(díasSOAT<=0,díasRTM<=0),"Vencido",
 *    IF(OR(díasSOAT<=30,díasRTM<=30,comparendos>0,kmActual>=kmProxMant,
 *          anomalía>=15,labrado<2,pruebaFrenado="Falla"),"Alerta","OK"))`
 */
export function calcularAlertaVehiculo(input: {
  diasSoat: number | null
  diasRtm: number | null
  comparendos: number
  kmActual: number | null
  kmProxMant: number | null
  anomaliaConsumoPct: number | null
  llantasLabradoMm: number | null
  pruebaFrenado: string | null
}): VehicleAlertState {
  const { diasSoat, diasRtm, comparendos, kmActual, kmProxMant, anomaliaConsumoPct: anomalia, llantasLabradoMm, pruebaFrenado } = input

  if ((diasSoat != null && diasSoat <= 0) || (diasRtm != null && diasRtm <= 0)) return 'VENCIDO'

  const enAlerta =
    (diasSoat != null && diasSoat <= 30) ||
    (diasRtm != null && diasRtm <= 30) ||
    comparendos > 0 ||
    (kmActual != null && kmProxMant != null && kmActual >= kmProxMant) ||
    (anomalia != null && anomalia >= 15) ||
    (llantasLabradoMm != null && llantasLabradoMm < 2) ||
    pruebaFrenado === 'Falla'

  return enAlerta ? 'ALERTA' : 'OK'
}

/** `=ROUND(AVERAGE(9 evaluaciones),0)` — ignora evaluaciones sin dato en
 * vez de tratarlas como 0 (mismo comportamiento que AVERAGE de Excel). */
export function calcularIcc(scores: (number | null)[]): number | null {
  const validos = scores.filter((s): s is number => s != null)
  if (validos.length === 0) return null
  return Math.round(validos.reduce((sum, s) => sum + s, 0) / validos.length)
}

export type DriverResult = 'Aprobado' | 'No aprobado'

/** `=IF(ICC>=70,"Aprobado","No aprobado")` */
export function calcularResultadoConductor(icc: number | null): DriverResult | null {
  if (icc == null) return null
  return icc >= 70 ? 'Aprobado' : 'No aprobado'
}

export type DriverAlertState = 'OK' | 'ALERTA' | 'LICENCIA_VENCIDA'

/**
 * `=IF(díasLicencia<=0,"Licencia vencida",
 *    IF(OR(díasLicencia<=30,ICC<70,estadoSalud="No apto"),"Alerta","OK"))`
 */
export function calcularAlertaConductor(input: {
  diasLicencia: number | null
  icc: number | null
  estadoSalud: string | null
}): DriverAlertState {
  const { diasLicencia, icc, estadoSalud } = input

  if (diasLicencia != null && diasLicencia <= 0) return 'LICENCIA_VENCIDA'

  const enAlerta = (diasLicencia != null && diasLicencia <= 30) || (icc != null && icc < 70) || estadoSalud === 'No apto'

  return enAlerta ? 'ALERTA' : 'OK'
}

/** `% de cumplimiento PESV (promedio de avance)` — promedio simple de
 * `% avance` de los 24 pasos, ignorando pasos sin dato todavía. */
export function calcularCumplimientoPesv(porcentajesAvance: (number | null)[]): number | null {
  const validos = porcentajesAvance.filter((p): p is number => p != null)
  if (validos.length === 0) return null
  return Math.round(validos.reduce((sum, p) => sum + p, 0) / validos.length)
}
