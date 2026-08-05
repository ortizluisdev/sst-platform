# Unificación de sidebar/header "Hoja N" en la vista Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que "Dashboard" sea un ítem padre expandible con Hoja 1…N anidadas, y que el encabezado siempre muestre "Hoja N · Nombre", de forma idéntica en Higiene Industrial y Seguridad Vial (vista Cliente), sin tocar Admin, backend, ni rutas.

**Architecture:** Una config compartida por servicio (`CLIENT_SHEETS_CONFIG`) reemplaza los mapas hardcodeados que hoy duplican la numeración/etiquetas de hojas en `DashboardSidebar.vue` y `ClientDashboardHojas.vue`, y corrige un bug real de anidación en Seguridad Vial (Historial/Alertas/Informes aparecían anidados bajo "Dashboard" quando deberían ser ítems hermanos).

**Tech Stack:** Vue 3 (`<script setup>`, Composition API), TypeScript, vue-i18n (modo composición), Pinia, Vitest + @vue/test-utils.

## Global Constraints

- Alcance: SOLO vista Cliente (Higiene Industrial + Seguridad Vial). No tocar Admin más allá de un cambio de una línea en `RoadSafetyAdminPanel.vue` (evitar que herede el string largo).
- No tocar rutas del router, backend, `RoadSafetyConfigTab.vue`, `CategoryConfigModal.vue`, `HigieneConfigTab.vue`.
- Keys internas de Seguridad Vial NO cambian (`hoja1`, `hoja2`, `hoja3`, `hoja4` siguen siendo esas keys) — solo cambia su `number` de visualización.
- Higiene Industrial debe verse y comportarse exactamente igual que antes (regresión visual cero).
- Todo texto nuevo debe existir en `es.json` y `en.json` (paridad de idiomas ya verificada como requisito del proyecto).
- Spec de referencia: `docs/superpowers/specs/2026-08-05-client-sidebar-hoja-unification-design.md`.

---

### Task 1: Config compartida `clientSheets.config.ts`

**Files:**
- Create: `frontend/src/config/clientSheets.config.ts`
- Test: `frontend/src/config/clientSheets.config.test.ts`

**Interfaces:**
- Produces: `ClientSheetDef { key: string; number: number; labelKey: string; shortLabelKey: string }`, `ClientServiceSheetsConfig { serviceSlug: string; mode: 'substate' | 'realtabs'; sheets: ClientSheetDef[] }`, `CLIENT_SHEETS_CONFIG: Record<string, ClientServiceSheetsConfig>` — usados por las Tasks 3 y 5.

- [ ] **Step 1: Escribir el test (falla porque el archivo de config no existe todavía)**

```ts
// frontend/src/config/clientSheets.config.test.ts
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
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `cd frontend && npx vitest run src/config/clientSheets.config.test.ts`
Expected: FAIL — `Cannot find module './clientSheets.config'` (o similar, el archivo no existe).

- [ ] **Step 3: Crear la config**

```ts
// frontend/src/config/clientSheets.config.ts

/** Una "hoja" del sidebar cliente — número/etiqueta de la nomenclatura
 * "Hoja N · Nombre" pedida por el product owner (ver spec 2026-08-05). */
export interface ClientSheetDef {
  /** Valor interno: `activeHoja` (Higiene Industrial) o `activeTab`
   * (Seguridad Vial). NUNCA cambia al renumerar — solo cambia `number`. */
  key: string
  /** 1-based, contiguo dentro de cada servicio (incluye el nodo "Dashboard"
   * cuando aplica). */
  number: number
  /** Clave i18n → "Hoja N · Nombre" completo, para el encabezado grande
   * (SectionTitleBanner). */
  labelKey: string
  /** Clave i18n → "Hoja N" corto (o "Dashboard" para el nodo padre), para
   * el ítem del sidebar. */
  shortLabelKey: string
}

export interface ClientServiceSheetsConfig {
  serviceSlug: string
  /** 'substate': Hoja 1 ES la pestaña "Dashboard" (`resumen`); Hoja 2..N son
   *  un sub-estado interno de esa misma pestaña (Higiene Industrial hoy,
   *  `v-model:active-hoja`). `sheets` cubre SOLO las hojas (3 en Higiene),
   *  el nodo padre ('resumen') no forma parte de `sheets`.
   *
   *  'realtabs': cada hoja (incluida Hoja 1 = "Dashboard") es una pestaña
   *  real e independiente (Seguridad Vial hoy, `v-model` normal). `sheets[0]`
   *  es siempre el nodo padre clickeable del acordeón; `sheets.slice(1)` es
   *  el submenú anidado. */
  mode: 'substate' | 'realtabs'
  sheets: ClientSheetDef[]
}

export const CLIENT_SHEETS_CONFIG: Record<string, ClientServiceSheetsConfig> = {
  'higiene-industrial': {
    serviceSlug: 'higiene-industrial',
    mode: 'substate',
    sheets: [
      { key: 'hoja1', number: 1, labelKey: 'dashboard.clientTabs.hoja1', shortLabelKey: 'dashboard.clientTabs.hoja1Short' },
      { key: 'hoja2', number: 2, labelKey: 'dashboard.clientTabs.hoja2', shortLabelKey: 'dashboard.clientTabs.hoja2Short' },
      { key: 'hoja3', number: 3, labelKey: 'dashboard.clientTabs.hoja3', shortLabelKey: 'dashboard.clientTabs.hoja3Short' },
    ],
  },
  'seguridad-vial': {
    serviceSlug: 'seguridad-vial',
    mode: 'realtabs',
    sheets: [
      { key: 'dashboard', number: 1, labelKey: 'roadSafety.tabs.dashboard', shortLabelKey: 'roadSafety.tabs.dashboardShort' },
      { key: 'hoja1', number: 2, labelKey: 'roadSafety.tabs.hoja1', shortLabelKey: 'roadSafety.tabs.hoja1Short' },
      { key: 'hoja2', number: 3, labelKey: 'roadSafety.tabs.hoja2', shortLabelKey: 'roadSafety.tabs.hoja2Short' },
      { key: 'hoja3', number: 4, labelKey: 'roadSafety.tabs.hoja3', shortLabelKey: 'roadSafety.tabs.hoja3Short' },
      { key: 'hoja4', number: 5, labelKey: 'roadSafety.tabs.hoja4', shortLabelKey: 'roadSafety.tabs.hoja4Short' },
    ],
  },
}
```

- [ ] **Step 4: Correr el test — debe seguir fallando (todavía faltan las claves i18n nuevas, Task 2)**

Run: `npx vitest run src/config/clientSheets.config.test.ts`
Expected: FAIL en el test de `labelKey`/`shortLabelKey` — `roadSafety.tabs.dashboardShort`, `hoja1Short..hoja4Short` todavía no existen en `es.json`/`en.json`. Los otros 3 tests (contigüidad, higiene, seguridad-vial shape) deben pasar. Esto es esperado — Task 2 lo completa.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/config/clientSheets.config.ts src/config/clientSheets.config.test.ts
git commit -m "feat: agregar config compartida de hojas por servicio (clientSheets.config.ts)"
```

---

### Task 2: Claves i18n nuevas (es.json + en.json)

**Files:**
- Modify: `frontend/src/i18n/locales/es.json` (bloque `roadSafety.tabs`, líneas 1151-1160)
- Modify: `frontend/src/i18n/locales/en.json` (bloque `roadSafety.tabs`, líneas 1151-1160)

**Interfaces:**
- Consumes: ninguno.
- Produces: claves `roadSafety.tabs.dashboard` (valor cambiado), `roadSafety.tabs.dashboardShort` (nueva), `roadSafety.tabs.hoja1Short..hoja4Short` (nuevas) — consumidas por Task 4 (`ClientDashboardView.vue`), Task 6 (`RoadSafetyAdminPanel.vue`), y el test de Task 1.

- [ ] **Step 1: Editar `es.json`**

Reemplazar:
```json
    "tabs": {
      "dashboard": "Dashboard",
      "hoja1": "Hoja 2 · Generalidad",
      "hoja2": "Hoja 3 · Vehículos",
      "hoja3": "Hoja 4 · Personas",
      "hoja4": "Hoja 5 · Rutograma",
      "alertas": "Panel de alertas",
      "historial": "Historial",
      "reportes": "Informes",
      "configuracion": "Configuración"
    },
```
por:
```json
    "tabs": {
      "dashboard": "Hoja 1 · Dashboard",
      "dashboardShort": "Dashboard",
      "hoja1": "Hoja 2 · Generalidad",
      "hoja1Short": "Hoja 2",
      "hoja2": "Hoja 3 · Vehículos",
      "hoja2Short": "Hoja 3",
      "hoja3": "Hoja 4 · Personas",
      "hoja3Short": "Hoja 4",
      "hoja4": "Hoja 5 · Rutograma",
      "hoja4Short": "Hoja 5",
      "alertas": "Panel de alertas",
      "historial": "Historial",
      "reportes": "Informes",
      "configuracion": "Configuración"
    },
```

- [ ] **Step 2: Editar `en.json`**

Reemplazar:
```json
    "tabs": {
      "dashboard": "Dashboard",
      "hoja1": "Sheet 2 · General",
      "hoja2": "Sheet 3 · Vehicles",
      "hoja3": "Sheet 4 · People",
      "hoja4": "Sheet 5 · Route map",
      "alertas": "Alerts panel",
      "historial": "History",
      "reportes": "Reports",
      "configuracion": "Settings"
    },
```
por:
```json
    "tabs": {
      "dashboard": "Sheet 1 · Dashboard",
      "dashboardShort": "Dashboard",
      "hoja1": "Sheet 2 · General",
      "hoja1Short": "Sheet 2",
      "hoja2": "Sheet 3 · Vehicles",
      "hoja2Short": "Sheet 3",
      "hoja3": "Sheet 4 · People",
      "hoja3Short": "Sheet 4",
      "hoja4": "Sheet 5 · Route map",
      "hoja4Short": "Sheet 5",
      "alertas": "Alerts panel",
      "historial": "History",
      "reportes": "Reports",
      "configuracion": "Settings"
    },
```

- [ ] **Step 3: Verificar que ambos JSON siguen siendo válidos**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/es.json')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json')); console.log('valid json')"`
Expected: `valid json`

- [ ] **Step 4: Correr el test de Task 1 — ahora debe pasar completo**

Run: `npx vitest run src/config/clientSheets.config.test.ts`
Expected: PASS (los 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/es.json src/i18n/locales/en.json
git commit -m "feat: agregar prefijo Hoja 1 a roadSafety.tabs.dashboard + claves cortas de hoja"
```

---

### Task 3: `DashboardSidebar.vue` — config-driven, corrige el bug de anidación

**Files:**
- Modify: `frontend/src/components/dashboard/DashboardSidebar.vue`
- Modify: `frontend/src/composables/useSidebarDrawer.ts` (exportar la injection key, solo para poder testear el componente — sin cambio de comportamiento)
- Test: `frontend/src/components/dashboard/DashboardSidebar.test.ts`

**Interfaces:**
- Consumes: `CLIENT_SHEETS_CONFIG` (Task 1).
- Produces: sin cambios de props/eventos públicos del componente (mismos `tabs`, `modelValue`, `services`, `selectedServiceSlug`, `activeHoja` que ya consume `ClientDashboardView.vue`).

- [ ] **Step 1: Exportar `SIDEBAR_DRAWER_KEY` (necesario para poder montar el componente en tests sin un layout real)**

En `frontend/src/composables/useSidebarDrawer.ts`, cambiar:
```ts
const SIDEBAR_DRAWER_KEY: InjectionKey<SidebarDrawerContext> = Symbol('sidebar-drawer')
```
por:
```ts
export const SIDEBAR_DRAWER_KEY: InjectionKey<SidebarDrawerContext> = Symbol('sidebar-drawer')
```

- [ ] **Step 2: Escribir el test (falla — la lógica vieja todavía no filtra por config)**

```ts
// frontend/src/components/dashboard/DashboardSidebar.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import { Home, ClipboardCheck, Truck, Users, Map, AlertTriangle, History, FileText } from 'lucide-vue-next'
import DashboardSidebar from './DashboardSidebar.vue'
import { SIDEBAR_DRAWER_KEY } from '@/composables/useSidebarDrawer'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import type { TabDef } from '@/types/dashboardTabs'

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es, en } })

const drawerStub = { isOpen: { value: false }, open: () => {}, close: () => {}, toggle: () => {} }

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
      provide: { [SIDEBAR_DRAWER_KEY as symbol]: drawerStub },
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
    const nestedTexts = wrapper.findAll('ul.ml-4 button').map((b) => b.text())
    expect(nestedTexts).toEqual(['Hoja 2', 'Hoja 3', 'Hoja 4', 'Hoja 5'])
  })

  it('Alertas/Historial/Informes aparecen como ítems hermanos de nivel superior (no anidados)', () => {
    const wrapper = mountSidebar({ tabs: roadSafetyTabs, selectedServiceSlug: 'seguridad-vial' })
    const topLevelKeys = ['alertas', 'historial', 'reportes']
    for (const label of ['Panel de alertas', 'Historial', 'Informes']) {
      expect(wrapper.text()).toContain(label)
    }
    // Ninguno de los 3 debe estar dentro del <ul> anidado bajo Dashboard.
    const nestedTexts = wrapper.findAll('ul.ml-4 button').map((b) => b.text())
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
    const nestedTexts = wrapper.findAll('ul.ml-4 button').map((b) => b.text())
    expect(nestedTexts).toEqual(['Hoja 1', 'Hoja 2', 'Hoja 3'])
  })
})
```

- [ ] **Step 3: Correr el test para confirmar que falla**

Run: `npx vitest run src/components/dashboard/DashboardSidebar.test.ts`
Expected: FAIL — el primer test (`nestedTexts`) va a incluir "Panel de alertas"/"Historial"/"Informes" además de las 4 hojas, porque el filtro viejo (`tab.key !== 'dashboard'`) agarra todo.

- [ ] **Step 4: Reemplazar la lógica hardcodeada por la config compartida**

En `frontend/src/components/dashboard/DashboardSidebar.vue`, agregar el import:
```ts
import { CLIENT_SHEETS_CONFIG } from '@/config/clientSheets.config'
```

Reemplazar:
```ts
// Seguridad Vial: todo lo que no sea el propio nodo "Dashboard" se dibuja
// anidado debajo de él (ver bloque en el template) — el resto de `tabs` ya
// viene en el orden correcto (hoja1-4, alertas) desde roadSafetyTabs en
// ClientDashboardView.vue.
const roadSafetyHojaTabs = computed(() => props.tabs.filter((tab) => tab.key !== 'dashboard'))

// Nivel superior del acordeón: en Seguridad Vial solo "Dashboard" se lista
// ahí — hoja1-4/alertas se sacan de este nivel porque ya se dibujan
// anidados (roadSafetyHojaTabs arriba); sin este filtro aparecerían
// duplicadas. Los demás servicios no cambian: `tabs` completo, como
// siempre.
const visibleTopTabs = computed(() =>
  props.selectedServiceSlug === 'seguridad-vial' ? props.tabs.filter((tab) => tab.key === 'dashboard') : props.tabs,
)
```
por:
```ts
// Config compartida de "hojas" por servicio (ver clientSheets.config.ts) —
// reemplaza el filtro anterior (`tab.key !== 'dashboard'`), que agarraba
// por error TODO lo que no fuera "dashboard" (incluía Alertas/Historial/
// Informes) en vez de solo las hojas reales (bug reportado 2026-08-05).
const sheetsConfig = computed(() => CLIENT_SHEETS_CONFIG[props.selectedServiceSlug])

// Solo aplica a servicios con mode: 'realtabs' (hoy: Seguridad Vial) — las
// hojas anidadas bajo "Dashboard" (sheets[0] es el propio nodo "Dashboard",
// nunca se incluye acá — ver template, ya se dibuja como botón padre).
const realtabsHojaTabs = computed(() => {
  const config = sheetsConfig.value
  if (!config || config.mode !== 'realtabs') return []
  const hojaKeys = new Set(config.sheets.slice(1).map((sheet) => sheet.key))
  return props.tabs.filter((tab) => hojaKeys.has(tab.key))
})

// Nivel superior del acordeón: en servicios 'realtabs' se excluyen las
// hojas anidadas (ya se dibujan en realtabsHojaTabs) pero se conservan los
// ítems hermanos sueltos (Alertas/Historial/Informes) — antes el filtro
// dejaba solo "dashboard" y por eso esos 3 terminaban cayendo, por
// descarte, dentro del submenú anidado (el bug). Los servicios 'substate'
// (Higiene Industrial) no cambian: `tabs` completo, como siempre.
const visibleTopTabs = computed(() => {
  const config = sheetsConfig.value
  if (!config || config.mode !== 'realtabs') return props.tabs
  const nestedHojaKeys = new Set(config.sheets.slice(1).map((sheet) => sheet.key))
  return props.tabs.filter((tab) => !nestedHojaKeys.has(tab.key))
})

/** Label corto ("Hoja N") para un ítem anidado — busca en la config
 * compartida en vez de usar `tab.label` (que trae el texto largo pensado
 * para el encabezado, no para el sidebar). */
function hojaShortLabel(key: string): string {
  const sheet = sheetsConfig.value?.sheets.find((s) => s.key === key)
  return sheet ? t(sheet.shortLabelKey) : key
}
```

Eliminar el `HOJAS` hardcodeado:
```ts
// "Hoja" ≠ "pestaña", pero SÍ es navegación de la pestaña "Dashboard" —
// vive anidada acá, un nivel más adentro, la misma idea que el acordeón de
// admin (servicio → pestañas) pero un nivel más profundo (pestaña → hoja).
const HOJAS = [
  { key: 'hoja1', label: 'dashboard.clientTabs.hoja1Short' },
  { key: 'hoja2', label: 'dashboard.clientTabs.hoja2Short' },
  { key: 'hoja3', label: 'dashboard.clientTabs.hoja3Short' },
] as const
```
(se borra por completo — ya no se usa).

- [ ] **Step 5: Actualizar el template — bloque de Higiene Industrial (Hoja 1/2/3 anidadas)**

Reemplazar:
```html
              <ul
                v-if="tab.key === 'resumen' && tab.key === modelValue && selectedServiceSlug === 'higiene-industrial'"
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-line-strong pl-2"
              >
                <li v-for="hoja in HOJAS" :key="hoja.key">
                  <button
                    type="button"
                    class="flex w-full items-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                    :class="
                      activeHoja === hoja.key
                        ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                        : 'border-l-[3px] border-transparent text-navy-700/80 hover:bg-sky-400/10'
                    "
                    @click="selectHoja(hoja.key)"
                  >
                    {{ t(hoja.label) }}
                  </button>
                </li>
              </ul>
```
por:
```html
              <ul
                v-if="tab.key === 'resumen' && tab.key === modelValue && sheetsConfig?.mode === 'substate'"
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-line-strong pl-2"
              >
                <li v-for="hoja in sheetsConfig!.sheets" :key="hoja.key">
                  <button
                    type="button"
                    class="flex w-full items-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                    :class="
                      activeHoja === hoja.key
                        ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                        : 'border-l-[3px] border-transparent text-navy-700/80 hover:bg-sky-400/10'
                    "
                    @click="selectHoja(hoja.key as 'hoja1' | 'hoja2' | 'hoja3')"
                  >
                    {{ t(hoja.shortLabelKey) }}
                  </button>
                </li>
              </ul>
```

- [ ] **Step 6: Actualizar el template — bloque de Seguridad Vial (hojas anidadas)**

Reemplazar:
```html
              <ul
                v-if="tab.key === 'dashboard' && selectedServiceSlug === 'seguridad-vial'"
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-line-strong pl-2"
              >
                <li v-for="hijaTab in roadSafetyHojaTabs" :key="hijaTab.key">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                    :class="
                      hijaTab.key === modelValue
                        ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                        : 'border-l-[3px] border-transparent text-navy-700/80 hover:bg-sky-400/10'
                    "
                    @click="selectTab(hijaTab.key)"
                  >
                    <component :is="hijaTab.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span class="min-w-0 flex-1 truncate">{{ hijaTab.label }}</span>
                  </button>
                </li>
              </ul>
```
por:
```html
              <ul
                v-if="sheetsConfig?.mode === 'realtabs' && tab.key === sheetsConfig.sheets[0]!.key"
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-line-strong pl-2"
              >
                <li v-for="hijaTab in realtabsHojaTabs" :key="hijaTab.key">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                    :class="
                      hijaTab.key === modelValue
                        ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                        : 'border-l-[3px] border-transparent text-navy-700/80 hover:bg-sky-400/10'
                    "
                    @click="selectTab(hijaTab.key)"
                  >
                    <component :is="hijaTab.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span class="min-w-0 flex-1 truncate">{{ hojaShortLabel(hijaTab.key) }}</span>
                  </button>
                </li>
              </ul>
```

- [ ] **Step 7: Actualizar el `v-if` del `ChevronDown` (mismo criterio genérico, sin cambio de comportamiento)**

Reemplazar:
```html
                <ChevronDown
                  v-if="tab.key === 'resumen' && tab.key === modelValue && selectedServiceSlug === 'higiene-industrial'"
                  class="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
```
por:
```html
                <ChevronDown
                  v-if="tab.key === 'resumen' && tab.key === modelValue && sheetsConfig?.mode === 'substate'"
                  class="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
```

- [ ] **Step 8: Correr el test — debe pasar**

Run: `npx vitest run src/components/dashboard/DashboardSidebar.test.ts`
Expected: PASS (los 3 tests).

- [ ] **Step 9: Type-check del frontend**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.vue src/composables/useSidebarDrawer.ts src/components/dashboard/DashboardSidebar.test.ts
git commit -m "fix: sidebar cliente anida solo hojas reales bajo Dashboard, config-driven"
```

---

### Task 4: `ClientDashboardView.vue` — botón "Dashboard" usa el label corto

**Files:**
- Modify: `frontend/src/modules/dashboard/views/ClientDashboardView.vue:106`

**Interfaces:**
- Consumes: clave i18n `roadSafety.tabs.dashboardShort` (Task 2).
- Produces: sin cambios de forma — `roadSafetyTabs` sigue siendo `TabDef[]` con las mismas 8 entradas (dashboard, hoja1-4, alertas, historial, reportes); solo cambia qué clave i18n alimenta el `label` de la entrada `dashboard`. Las entradas `hoja1..hoja4` se conservan tal cual (Task 3 ya filtra cuáles se muestran anidadas vs. sueltas usando la config, no removiendo entradas de este array — los íconos de hoja1-4 siguen viniendo de acá).

- [ ] **Step 1: Editar la línea 106**

Reemplazar:
```ts
  { key: 'dashboard', label: t('roadSafety.tabs.dashboard'), icon: Home },
```
por:
```ts
  { key: 'dashboard', label: t('roadSafety.tabs.dashboardShort'), icon: Home },
```

(Sin otro cambio en `roadSafetyTabs` — ver nota de Interfaces arriba: el filtrado de qué aparece anidado vs. suelto ya lo resuelve `DashboardSidebar.vue`, Task 3, con `nestedHojaKeys`/`realtabsHojaTabs`; no hace falta remover `hoja1..hoja4` de este array.)

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 3: Verificación manual — botón "Dashboard" del sidebar Cliente**

Con `npm run dev` corriendo, entrar a `/es/dashboard/seguridad-vial` con una cuenta cliente que tenga ese servicio: el botón "Dashboard" del sidebar debe decir "Dashboard" (corto, sin "Hoja 1 ·").

- [ ] **Step 4: Commit**

```bash
git add src/modules/dashboard/views/ClientDashboardView.vue
git commit -m "fix: botón Dashboard del sidebar cliente usa el label corto"
```

---

### Task 5: `ClientDashboardHojas.vue` — título desde la config compartida

**Files:**
- Modify: `frontend/src/components/dashboard/client/ClientDashboardHojas.vue`
- Test: `frontend/src/components/dashboard/client/ClientDashboardHojas.test.ts`

**Interfaces:**
- Consumes: `CLIENT_SHEETS_CONFIG` (Task 1).
- Produces: sin cambios de props/eventos.

- [ ] **Step 1: Escribir el test (falla — el archivo todavía usa el `TITLES` viejo, que da el mismo resultado hoy, pero el test valida el NUEVO mecanismo)**

```ts
// frontend/src/components/dashboard/client/ClientDashboardHojas.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
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
    global: { plugins: [i18n] },
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
```

- [ ] **Step 2: Correr el test para confirmar el estado actual**

Run: `npx vitest run src/components/dashboard/client/ClientDashboardHojas.test.ts`
Expected: PASS — el mecanismo viejo (`TITLES`) ya produce el mismo texto hoy. Esto es intencional: el test fija el comportamiento ANTES del refactor, para que Step 4 (correrlo de nuevo) confirme que el refactor no lo rompió, no que lo arregló (acá no hay bug, es solo remover una duplicación).

- [ ] **Step 3: Reemplazar `TITLES` por la config compartida**

En `frontend/src/components/dashboard/client/ClientDashboardHojas.vue`, agregar el import:
```ts
import { CLIENT_SHEETS_CONFIG } from '@/config/clientSheets.config'
```

Reemplazar:
```ts
// El selector de Hoja 1/2/3 vive en el sidebar (DashboardSidebar.vue),
// anidado bajo la pestaña "Dashboard" — acá solo queda el título de la hoja
// activa y el botón para generar el reporte (PDF/CSV reales del backend,
// exactos a la plantilla — ver reports.service.ts).
const TITLES = {
  hoja1: 'dashboard.clientTabs.hoja1',
  hoja2: 'dashboard.clientTabs.hoja2',
  hoja3: 'dashboard.clientTabs.hoja3',
} as const

const currentTitle = computed(() => t(TITLES[activeHoja.value]))
```
por:
```ts
// El selector de Hoja 1/2/3 vive en el sidebar (DashboardSidebar.vue),
// anidado bajo la pestaña "Dashboard" — acá solo queda el título de la hoja
// activa y el botón para generar el reporte (PDF/CSV reales del backend,
// exactos a la plantilla — ver reports.service.ts). El título sale de
// CLIENT_SHEETS_CONFIG (antes era un mapa duplicado acá y en
// DashboardSidebar.vue — una sola fuente de verdad ahora).
const currentTitle = computed(() => {
  const sheet = CLIENT_SHEETS_CONFIG['higiene-industrial']!.sheets.find((s) => s.key === activeHoja.value)
  return sheet ? t(sheet.labelKey) : ''
})
```

- [ ] **Step 4: Correr el test — debe seguir pasando (sin regresión)**

Run: `npx vitest run src/components/dashboard/client/ClientDashboardHojas.test.ts`
Expected: PASS (los 3 tests) — mismo texto que antes, ahora desde la config compartida.

- [ ] **Step 5: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/client/ClientDashboardHojas.vue src/components/dashboard/client/ClientDashboardHojas.test.ts
git commit -m "refactor: título de ClientDashboardHojas sale de la config compartida, sin TITLES duplicado"
```

---

### Task 6: `RoadSafetyAdminPanel.vue` — no heredar el string largo (fix de una línea)

**Files:**
- Modify: `frontend/src/components/dashboard/operacion/RoadSafetyAdminPanel.vue:43`

**Interfaces:**
- Consumes: clave i18n `roadSafety.tabs.dashboardShort` (Task 2).
- Produces: sin cambios.

- [ ] **Step 1: Editar la línea 43**

Reemplazar:
```ts
  { key: 'dashboard', label: t('roadSafety.tabs.dashboard'), icon: Home },
```
por:
```ts
  { key: 'dashboard', label: t('roadSafety.tabs.dashboardShort'), icon: Home },
```

Cambio puramente mecánico — `key: 'dashboard'` e `icon: Home` no cambian; sin este fix, el sidebar Admin heredaría "Hoja 1 · Dashboard" (pensado solo para Cliente) por compartir la misma clave i18n que se cambió en Task 2. Verificado: antes y después el texto renderizado es idéntico ("Dashboard", ES y EN), porque `dashboardShort` tiene el mismo valor que `dashboard` tenía antes de Task 2.

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 3: Verificación manual — sidebar Admin de Seguridad Vial**

Con `npm run dev` corriendo, entrar como admin a la vista de Seguridad Vial de cualquier empresa (Operación → Seguridad Vial): el botón "Dashboard" del sidebar Admin debe seguir diciendo "Dashboard" (nunca "Hoja 1 · Dashboard"), en ambos idiomas.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/operacion/RoadSafetyAdminPanel.vue
git commit -m "fix: sidebar Admin de Seguridad Vial no hereda el label largo de Hoja 1"
```

---

### Task 7: Verificación final de regresión (spec §Verificación)

**Files:** ninguno (solo comandos + checklist manual).

- [ ] **Step 1: Suite completa de tests del frontend**

Run: `cd frontend && npm run test`
Expected: todos los tests pasan, incluidos los 3 archivos nuevos de este plan y los 3 preexistentes (`i18n/index.test.ts`, `types/contact.test.ts`, `components/ui/AccordionPanel.test.ts`).

- [ ] **Step 2: Type-check completo (frontend + backend, backend no debería tener cambios)**

Run: `cd frontend && npx vue-tsc -b`
Expected: sin errores.

Run: `cd backend && npm run typecheck`
Expected: sin errores (ningún archivo de backend se tocó en este plan).

- [ ] **Step 3: Checklist manual en navegador (`npm run dev` en frontend), ambos idiomas (selector EN/ES)**

1. Higiene Industrial (Cliente): sidebar y header se ven y navegan exactamente igual que antes de este cambio — Dashboard se expande a Hoja 1/2/3, header dice "Hoja 1 · Dashboard" / "Hoja 2 · Detalle técnico" / "Hoja 3 · Análisis".
2. Seguridad Vial (Cliente): Historial/Informes/Panel de alertas aparecen como ítems sueltos (hermanos), ya NO anidados bajo "Dashboard".
3. Seguridad Vial (Cliente): submenú anidado bajo "Dashboard" muestra solo 4 ítems — "Hoja 2", "Hoja 3", "Hoja 4", "Hoja 5" (sin nombre de sección).
4. Seguridad Vial (Cliente): al entrar al servicio, el header dice "Hoja 1 · Dashboard"; al navegar por cada hoja, dice "Hoja 2 · Generalidad", "Hoja 3 · Vehículos", "Hoja 4 · Personas", "Hoja 5 · Rutograma" — y "Sheet N · ..." en inglés.
5. Seguridad Vial (Admin): el sidebar Admin sigue mostrando "Dashboard" corto (sin número) — confirmar que Task 6 no le filtró el prefijo.
6. Correspondencia 1:1 entre el número que muestra el sidebar (colapsado a "Hoja N") y el número del header grande, en ambos servicios.
7. Mobile (drawer) y desktop, sidebar colapsado y expandido — logo/textos no rotos en ningún estado.

- [ ] **Step 4: Confirmar cero cambios fuera de alcance**

Run: `git diff main --stat` (o la rama base correspondiente)
Expected: únicamente estos archivos aparecen en el diff — `frontend/src/config/clientSheets.config.ts` (nuevo), `frontend/src/config/clientSheets.config.test.ts` (nuevo), `frontend/src/i18n/locales/es.json`, `frontend/src/i18n/locales/en.json`, `frontend/src/components/dashboard/DashboardSidebar.vue`, `frontend/src/components/dashboard/DashboardSidebar.test.ts` (nuevo), `frontend/src/composables/useSidebarDrawer.ts`, `frontend/src/modules/dashboard/views/ClientDashboardView.vue`, `frontend/src/components/dashboard/client/ClientDashboardHojas.vue`, `frontend/src/components/dashboard/client/ClientDashboardHojas.test.ts` (nuevo), `frontend/src/components/dashboard/operacion/RoadSafetyAdminPanel.vue`. Ningún archivo de backend, rutas, ni de las pantallas de Configuración/CategoryConfig.
