import type { Locale } from '@/i18n'

/**
 * `service.nombre` viene de la tabla `services` (dato de negocio, sembrado
 * en español) — no es una clave de i18n. Mismo patrón que categoryLabel.ts:
 * traducción de EXHIBICIÓN por `slug` (estable, a diferencia de `nombre`),
 * sin tocar el backend. Si un servicio no está mapeado, se muestra el
 * nombre tal cual llega — nunca se rompe.
 */
const SERVICE_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  'higiene-industrial': { en: 'Industrial Hygiene' },
  'seguridad-vial': { en: 'Road Safety' },
  'riesgo-mecanico-locativo': { en: 'Mechanical and Site Risk' },
  'mantenimiento-basado-en-riesgo': { en: 'Risk-Based Maintenance' },
  'modelado-cientifico-comportamiento-social': { en: 'Scientific Modeling of Social Behavior' },
}

export function serviceLabel(slug: string, nombre: string, locale: Locale): string {
  return SERVICE_LABELS[slug]?.[locale] ?? nombre
}

/**
 * Versión corta para el sidebar de Operación (Admin) — los 3 servicios del
 * catálogo completo que todavía no tienen dashboard real (Mantenimiento
 * Basado en Riesgo, Modelado Científico del Comportamiento Social, Riesgo
 * Mecánico y Locativo, 2026-08) tienen nombres largos que se veían mal en
 * el sidebar angosto. Solo esos 3 tienen entrada acá — el resto usa
 * `serviceLabel` sin cambios (sus nombres ya son cortos). El nombre
 * completo sigue disponible vía el atributo `title` del botón que usa esto.
 */
const SERVICE_SHORT_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  'riesgo-mecanico-locativo': { es: 'Riesgo Mecánico', en: 'Mechanical Risk' },
  'mantenimiento-basado-en-riesgo': { es: 'Mantenimiento', en: 'Maintenance' },
  'modelado-cientifico-comportamiento-social': { es: 'Modelado Científico', en: 'Scientific Modeling' },
}

export function serviceShortLabel(slug: string, nombre: string, locale: Locale): string {
  return SERVICE_SHORT_LABELS[slug]?.[locale] ?? serviceLabel(slug, nombre, locale)
}
