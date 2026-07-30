import type { Locale } from '@/i18n'

/**
 * `categoria` viene del catálogo de VariableDefinition (dato de negocio en
 * la base de datos, sembrado en español) — no es una clave de i18n. Esta
 * tabla es una traducción de EXHIBICIÓN puramente decorativa para no dejar
 * el sidebar en español cuando el resto de la interfaz está en inglés, sin
 * tocar el backend. Si una categoría no está mapeada (ej. un servicio
 * futuro), se muestra el nombre tal cual llega — nunca se rompe.
 */
const CATEGORY_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  Iluminación: { en: 'Lighting' },
  Sonido: { en: 'Sound' },
  'Estrés Térmico': { en: 'Thermal Stress' },
  'Radiación UV': { en: 'UV Radiation' },
  Vibración: { en: 'Vibration' },
}

export function categoryLabel(categoria: string, locale: Locale): string {
  return CATEGORY_LABELS[categoria]?.[locale] ?? categoria
}
