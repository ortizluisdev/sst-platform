/**
 * Campos corregibles de Hoja 2 (Vehículos) y Hoja 3 (Conductores) — solo las
 * columnas que se guardan tal cual del Excel, nunca las calculadas al leer
 * (Días SOAT/RTM, Anomalía consumo, Alerta, ICC, Resultado, Días licencia —
 * ver roadSafety.service.ts). El tipo declarado acá decide cómo se valida y
 * coacciona `value` en roadSafetyCorrections.ts antes de guardar.
 */
export type RoadSafetyFieldType = 'string' | 'text' | 'int' | 'float' | 'boolean' | 'date'

export const VEHICULO_FIELDS: Record<string, RoadSafetyFieldType> = {
  placa: 'string',
  tipo: 'string',
  marcaLinea: 'string',
  modeloAnio: 'int',
  ciudad: 'string',
  zona: 'string',
  sede: 'string',
  rutasAsignadas: 'string',
  conductoresAsignados: 'text',
  soatVence: 'date',
  rtmVence: 'date',
  polizaRcVence: 'date',
  tarjetaOperacionVence: 'date',
  comparendos: 'int',
  ultMantenimiento: 'date',
  kmActual: 'int',
  kmProxMant: 'int',
  cambioAceite: 'date',
  pruebaFrenado: 'string',
  alineacionBalanceo: 'date',
  llantasLabradoMm: 'float',
  lucesSenales: 'string',
  preoperacionalUlt: 'date',
  consumoGalMes: 'float',
  rendimientoKmGal: 'float',
  rendimientoBaseKmGal: 'float',
  seguridadActiva: 'boolean',
  seguridadPasiva: 'boolean',
  gpsTelemetria: 'boolean',
}

export const CONDUCTOR_FIELDS: Record<string, RoadSafetyFieldType> = {
  documento: 'string',
  nombre: 'string',
  cargo: 'string',
  actorVial: 'string',
  ciudad: 'string',
  sede: 'string',
  vehiculosAsignados: 'text',
  licCategoria: 'string',
  licenciaVence: 'date',
  psicosensometricoVence: 'date',
  estadoSalud: 'string',
  nCursosSv: 'int',
  horasFormacion: 'float',
  ultimaCapacitacion: 'date',
  reentrenamientoProgramado: 'date',
  scoreConduccionSegura: 'int',
  scoreManejoDefensivo: 'int',
  scoreManejoComentadoDiurno: 'int',
  scoreManejoComentadoNocturno: 'int',
  scoreConocimientoVehiculo: 'int',
  scoreNormasTransito: 'int',
  scoreGestionFatiga: 'int',
  scoreInvestigacionSiniestros: 'int',
  scorePrimerosAuxilios: 'int',
}

export class RoadSafetyFieldValidationError extends Error {}

/** Valida `field` contra el spec de la entidad y coacciona `value` al tipo
 * declarado — lanza RoadSafetyFieldValidationError con mensaje listo para
 * mostrar si el campo no existe o el valor no coincide con su tipo. */
export function coerceFieldValue(
  fields: Record<string, RoadSafetyFieldType>,
  field: string,
  value: unknown,
): { field: string; value: string | number | boolean | Date | null } {
  const type = fields[field]
  if (!type) throw new RoadSafetyFieldValidationError(`Campo no corregible: ${field}`)

  if (value === null || value === '') return { field, value: null }

  switch (type) {
    case 'string':
    case 'text': {
      if (typeof value !== 'string') throw new RoadSafetyFieldValidationError(`${field} debe ser texto`)
      return { field, value }
    }
    case 'int': {
      const parsed = typeof value === 'number' ? value : Number(value)
      if (!Number.isInteger(parsed)) throw new RoadSafetyFieldValidationError(`${field} debe ser un número entero`)
      return { field, value: parsed }
    }
    case 'float': {
      const parsed = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(parsed)) throw new RoadSafetyFieldValidationError(`${field} debe ser un número`)
      return { field, value: parsed }
    }
    case 'boolean': {
      if (typeof value !== 'boolean') throw new RoadSafetyFieldValidationError(`${field} debe ser verdadero/falso`)
      return { field, value }
    }
    case 'date': {
      const parsed = new Date(value as string)
      if (Number.isNaN(parsed.getTime())) throw new RoadSafetyFieldValidationError(`${field} debe ser una fecha válida`)
      return { field, value: parsed }
    }
  }
}
