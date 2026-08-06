import type { Locale } from '@/i18n'

/**
 * `concepto` viene del catálogo fijo de inventario de movilidad de
 * Seguridad Vial (backend/src/utils/roadSafetyConstants.ts — extraído
 * literal de la plantilla Excel de referencia, nunca cambia entre
 * clientes) — no es una clave de i18n. Mismo patrón que
 * variableLabel.ts/pesvStepLabel.ts: traducción de EXHIBICIÓN por el texto
 * mismo (estable porque viene de una lista fija, sin ID numérico propio),
 * sin tocar el backend. Si un concepto no está mapeado, se muestra el
 * texto tal cual llega — nunca se rompe.
 */
const INVENTORY_CONCEPT_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  // ACTORES_VIALES
  'Peatones (colaboradores que se desplazan a pie)': { en: 'Pedestrians (employees who commute on foot)' },
  Ciclistas: { en: 'Cyclists' },
  'Usuarios de monopatín / patineta eléctrica': { en: 'Scooter / e-scooter users' },
  Motociclistas: { en: 'Motorcyclists' },
  'Conductores de vehículo liviano': { en: 'Light vehicle drivers' },
  'Conductores de vehículo pesado': { en: 'Heavy vehicle drivers' },
  'Operadores de equipo especial (grúa, montacargas)': { en: 'Special equipment operators (crane, forklift)' },
  Pasajeros: { en: 'Passengers' },
  // PARQUE_AUTOMOTOR
  'Vehículos livianos': { en: 'Light vehicles' },
  'Vehículos pesados / carga': { en: 'Heavy / cargo vehicles' },
  Motocicletas: { en: 'Motorcycles' },
  'Bicicletas / monopatines (empresa)': { en: 'Bicycles / scooters (company-owned)' },
  'Equipo especial (grúas, montacargas)': { en: 'Special equipment (cranes, forklifts)' },
  // COBERTURA_OPERACIONAL
  Sedes: { en: 'Sites' },
  'Ciudades con operación': { en: 'Cities of operation' },
  'Rutas activas': { en: 'Active routes' },
  'Km promedio recorridos / mes': { en: 'Average km driven / month' },
}

export function inventoryConceptLabel(concepto: string, locale: Locale): string {
  return INVENTORY_CONCEPT_LABELS[concepto]?.[locale] ?? concepto
}
