import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale } from './index'

describe('isSupportedLocale', () => {
  it('accepts every locale in SUPPORTED_LOCALES', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isSupportedLocale(locale)).toBe(true)
    }
  })

  it('rejects unsupported locale codes', () => {
    expect(isSupportedLocale('fr')).toBe(false)
    expect(isSupportedLocale('ES')).toBe(false) // case-sensitive, matches the router's (es|en) pattern
    expect(isSupportedLocale('')).toBe(false)
  })

  it('rejects null and undefined', () => {
    expect(isSupportedLocale(null)).toBe(false)
    expect(isSupportedLocale(undefined)).toBe(false)
  })
})

describe('DEFAULT_LOCALE', () => {
  it('is one of the supported locales', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE)
  })
})
