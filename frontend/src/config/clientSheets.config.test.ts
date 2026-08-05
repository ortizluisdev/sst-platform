import { describe, expect, it } from 'vitest'
import { CLIENT_SHEETS_CONFIG } from './clientSheets.config'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'

function resolveKey(messages: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) return (node as Record<string, unknown>)[part]
    return undefined
  }, messages)
}

describe('CLIENT_SHEETS_CONFIG', () => {
  it('numbers sheets contiguously starting at 1 for every service', () => {
    for (const config of Object.values(CLIENT_SHEETS_CONFIG)) {
      const numbers = config.sheets.map((s) => s.number)
      expect(numbers).toEqual(config.sheets.map((_, i) => i + 1))
    }
  })

  it('every labelKey and shortLabelKey resolves to a non-empty string in es.json and en.json', () => {
    for (const config of Object.values(CLIENT_SHEETS_CONFIG)) {
      for (const sheet of config.sheets) {
        for (const key of [sheet.labelKey, sheet.shortLabelKey]) {
          expect(typeof resolveKey(es, key), `es.json missing ${key}`).toBe('string')
          expect(typeof resolveKey(en, key), `en.json missing ${key}`).toBe('string')
        }
      }
    }
  })

  it('higiene-industrial: 3 hojas, mode substate', () => {
    const config = CLIENT_SHEETS_CONFIG['higiene-industrial']!
    expect(config.mode).toBe('substate')
    expect(config.sheets.map((s) => s.key)).toEqual(['hoja1', 'hoja2', 'hoja3'])
  })

  it('seguridad-vial: dashboard + hoja1..4 (5 sheets), mode realtabs, numerado 1..5', () => {
    const config = CLIENT_SHEETS_CONFIG['seguridad-vial']!
    expect(config.mode).toBe('realtabs')
    expect(config.sheets.map((s) => s.key)).toEqual(['dashboard', 'hoja1', 'hoja2', 'hoja3', 'hoja4'])
    expect(config.sheets.map((s) => s.number)).toEqual([1, 2, 3, 4, 5])
  })
})
