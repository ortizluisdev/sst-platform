import type { Locale } from '@/i18n'

const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-CO',
  en: 'en-US',
}

export function formatDate(date: Date | string, locale: Locale): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toLocaleDateString(INTL_LOCALE[locale])
}
