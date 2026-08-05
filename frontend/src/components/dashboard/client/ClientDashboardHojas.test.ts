import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import ClientDashboardHojas from './ClientDashboardHojas.vue'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import type { DashboardData } from '@/types/dashboard'

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es, en } })

const dashboardStub = {
  service: { slug: 'higiene-industrial', nombre: 'Higiene Industrial', updateFrequency: 'WEEKLY' },
  lastUpdated: null,
  totalWorkPoints: 0,
  categories: [],
  globalCompliance: { pct: 0, verde: 0, amarillo: 0, rojo: 0, total: 0 },
  riesgoGlobal: null,
  alertasActivas: 0,
  tendenciaGlobal: null,
  evolucionIgho: null,
  probabilidadIncumplimiento: null,
  riesgoSalud: null,
  puntajeIntervencion: null,
  prioridadIntervencion: null,
  matrizPosicion: null,
  trend: [],
  filtrosDisponibles: { areasPlanta: [], procesosActividad: [] },
} as unknown as DashboardData

function mountHojas(activeHoja: 'hoja1' | 'hoja2' | 'hoja3') {
  return mount(ClientDashboardHojas, {
    props: {
      dashboard: dashboardStub,
      activeHoja,
      'onUpdate:activeHoja': () => {},
      fetchHistory: async () => [],
      fetchFilteredDashboard: async () => dashboardStub,
    },
    global: { plugins: [i18n, createPinia()] },
  })
}

describe('ClientDashboardHojas — título desde CLIENT_SHEETS_CONFIG', () => {
  it('hoja1 → "Hoja 1 · Dashboard"', () => {
    expect(mountHojas('hoja1').text()).toContain('Hoja 1 · Dashboard')
  })

  it('hoja2 → "Hoja 2 · Detalle técnico"', () => {
    expect(mountHojas('hoja2').text()).toContain('Hoja 2 · Detalle técnico')
  })

  it('hoja3 → "Hoja 3 · Análisis"', () => {
    expect(mountHojas('hoja3').text()).toContain('Hoja 3 · Análisis')
  })
})
