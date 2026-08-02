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
