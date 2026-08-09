import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import { ref } from 'vue'
import { Home, ClipboardCheck, Truck, Users, Map, AlertTriangle, History, FileText } from 'lucide-vue-next'
import DashboardSidebar from './DashboardSidebar.vue'
import { SIDEBAR_DRAWER_KEY } from '@/composables/useSidebarDrawer'
import { SIDEBAR_COLLAPSE_KEY } from '@/composables/useSidebarCollapse'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import type { TabDef } from '@/types/dashboardTabs'

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es, en } })

const drawerStub = { isOpen: { value: false }, open: () => {}, close: () => {}, toggle: () => {} }
// `ref()` real, no un objeto plano `{ value: false }`: Vue solo
// auto-desenvuelve refs de verdad en el template (`isRef()`), así que un
// objeto plano truthy siempre evaluaba `collapsed` como verdadero sin
// importar `.value` — no se notaba antes porque las clases dependientes
// eran estáticas; ahora que el markup colapsado depende del valor real,
// hace falta un ref real acá.
const collapseStub = { collapsed: ref(false), toggle: () => {} }

function mountSidebar(props: { tabs: TabDef[]; selectedServiceSlug: string; modelValue?: string }) {
  return mount(DashboardSidebar, {
    props: {
      modelValue: props.modelValue ?? 'dashboard',
      services: [{ slug: props.selectedServiceSlug, nombre: 'Empresa Test' }],
      selectedServiceSlug: props.selectedServiceSlug,
      tabs: props.tabs,
    },
    global: {
      plugins: [i18n, createPinia()],
      provide: { [SIDEBAR_DRAWER_KEY as symbol]: drawerStub, [SIDEBAR_COLLAPSE_KEY as symbol]: collapseStub },
    },
  })
}

const roadSafetyTabs: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'hoja1', label: 'Hoja 2 · Generalidad', icon: ClipboardCheck },
  { key: 'hoja2', label: 'Hoja 3 · Vehículos', icon: Truck },
  { key: 'hoja3', label: 'Hoja 4 · Personas', icon: Users },
  { key: 'hoja4', label: 'Hoja 5 · Rutograma', icon: Map },
  { key: 'alertas', label: 'Panel de alertas', icon: AlertTriangle },
  { key: 'historial', label: 'Historial', icon: History },
  { key: 'reportes', label: 'Informes', icon: FileText },
]

describe('DashboardSidebar — Seguridad Vial (mode: realtabs)', () => {
  it('anida SOLO hoja1..hoja4 bajo "Dashboard" — Alertas/Historial/Informes NO están anidados (regresión del bug reportado)', () => {
    const wrapper = mountSidebar({ tabs: roadSafetyTabs, selectedServiceSlug: 'seguridad-vial' })
    const nestedTexts = wrapper.findAll('ul.ml-4 ul.ml-4 button').map((b) => b.text())
    expect(nestedTexts).toEqual(['Hoja 2', 'Hoja 3', 'Hoja 4', 'Hoja 5'])
  })

  it('Alertas/Historial/Informes aparecen como ítems hermanos de nivel superior (no anidados)', () => {
    const wrapper = mountSidebar({ tabs: roadSafetyTabs, selectedServiceSlug: 'seguridad-vial' })
    const topLevelKeys = ['alertas', 'historial', 'reportes']
    for (const label of ['Panel de alertas', 'Historial', 'Informes']) {
      expect(wrapper.text()).toContain(label)
    }
    // Ninguno de los 3 debe estar dentro del <ul> anidado bajo Dashboard.
    const nestedTexts = wrapper.findAll('ul.ml-4 ul.ml-4 button').map((b) => b.text())
    for (const label of ['Panel de alertas', 'Historial', 'Informes']) {
      expect(nestedTexts).not.toContain(label)
    }
    void topLevelKeys
  })
})

const higieneTabs: TabDef[] = [{ key: 'resumen', label: 'Dashboard', icon: Home }]

describe('DashboardSidebar — Higiene Industrial (mode: substate, sin regresión)', () => {
  it('sigue mostrando Hoja 1/Hoja 2/Hoja 3 anidadas bajo "Dashboard" cuando resumen está activo', () => {
    const wrapper = mountSidebar({ tabs: higieneTabs, selectedServiceSlug: 'higiene-industrial', modelValue: 'resumen' })
    const nestedTexts = wrapper.findAll('ul.ml-4 ul.ml-4 button').map((b) => b.text())
    expect(nestedTexts).toEqual(['Hoja 1', 'Hoja 2', 'Hoja 3'])
  })
})
