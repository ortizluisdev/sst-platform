import { createI18n } from 'vue-i18n'

export type Locale = 'es' | 'en'
export const SUPPORTED_LOCALES: Locale[] = ['es', 'en']
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_STORAGE_KEY = 'roma-locale'

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*.json')
const loadedLocales = new Set<Locale>()

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {},
})

async function loadLocaleMessages(locale: Locale) {
  if (loadedLocales.has(locale)) return
  const importer = localeModules[`./locales/${locale}.json`]
  if (!importer) throw new Error(`Unknown locale: ${locale}`)
  const module = await importer()
  i18n.global.setLocaleMessage(locale, module.default)
  loadedLocales.add(locale)
}

/** Activates a locale: loads its messages if needed, updates i18n state, <html lang>, and the saved preference. */
export async function setLocale(locale: Locale) {
  await loadLocaleMessages(locale)
  ;(i18n.global.locale as { value: Locale }).value = locale
  document.documentElement.lang = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale)
}
