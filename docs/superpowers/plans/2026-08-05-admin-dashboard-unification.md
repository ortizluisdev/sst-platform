# Uniformización del Dashboard Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que el Dashboard Admin de Seguridad Vial reutilice el mismo sistema de semáforo (`SummaryCard`/`ComplianceRing`/`SEMAPHORE_STYLES`) que ya usa Higiene Industrial, sin inventar umbrales de negocio nuevos ni construir funcionalidad que no existe.

**Architecture:** Dos funciones puras nuevas (`classifyPesvCompliance`, `buildPesvGlobalCompliance`) en un archivo de utilidad nuevo alimentan `SummaryCard`/`ComplianceRing` (componentes genéricos ya existentes, sin cambios) desde `RoadSafetyDashboardTab.vue`. `RoadSafetyHoja2Tab.vue`/`RoadSafetyHoja3Tab.vue` reemplazan su mapa de colores hardcodeado por `SEMAPHORE_STYLES` (también ya existente).

**Tech Stack:** Vue 3 (`<script setup>`, Composition API), TypeScript, vue-i18n, Vitest.

## Global Constraints

- Alcance: SOLO Dashboard Admin de Seguridad Vial + paridad de colores en Hoja 2/Hoja 3. No tocar Configuración, CRUD de variables/indicadores, `DashboardShell.vue`, `CategoryTab.vue`, backend, ni Cliente.
- Umbral de `cumplimientoPesvGlobal` (aprobado, NO renegociable en esta pasada): **≥80% VERDE, 60-79% AMARILLO, <60% ROJO**, `null` → `SIN_DATOS`.
- Los conteos (`totalVehiculos`/`totalConductores`/`totalRutas`) y las 4 tarjetas de alertas de vencimiento NO se convierten a `SummaryCard` — no tienen semántica de cumplimiento, se quedan como están.
- No cambiar texto (i18n), lógica de negocio, ni las fórmulas de `roadSafetyCalculations.ts`.
- Spec de referencia: `docs/superpowers/specs/2026-08-05-admin-dashboard-unification-design.md`.

---

### Task 1: Funciones puras `classifyPesvCompliance` y `buildPesvGlobalCompliance`

**Files:**
- Create: `frontend/src/utils/roadSafetyCompliance.ts`
- Test: `frontend/src/utils/roadSafetyCompliance.test.ts`

**Interfaces:**
- Produces: `classifyPesvCompliance(pct: number | null): CategoryCardStatus`, `buildPesvGlobalCompliance(pasos: RoadSafetyPesvPaso[]): { pct: number; verde: number; amarillo: number; rojo: number; total: number }` (mismo shape que `GlobalCompliance` de `@/types/dashboard`) — consumidas por Task 2.

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// frontend/src/utils/roadSafetyCompliance.test.ts
import { describe, it, expect } from 'vitest'
import { classifyPesvCompliance, buildPesvGlobalCompliance } from './roadSafetyCompliance'
import type { RoadSafetyPesvPaso } from '@/types/roadSafety'

describe('classifyPesvCompliance', () => {
  it('null → SIN_DATOS', () => {
    expect(classifyPesvCompliance(null)).toBe('SIN_DATOS')
  })

  it('80 (límite inferior VERDE) → VERDE', () => {
    expect(classifyPesvCompliance(80)).toBe('VERDE')
  })

  it('100 → VERDE', () => {
    expect(classifyPesvCompliance(100)).toBe('VERDE')
  })

  it('79 (justo debajo del límite VERDE) → AMARILLO', () => {
    expect(classifyPesvCompliance(79)).toBe('AMARILLO')
  })

  it('60 (límite inferior AMARILLO) → AMARILLO', () => {
    expect(classifyPesvCompliance(60)).toBe('AMARILLO')
  })

  it('59 (justo debajo del límite AMARILLO) → ROJO', () => {
    expect(classifyPesvCompliance(59)).toBe('ROJO')
  })

  it('0 → ROJO', () => {
    expect(classifyPesvCompliance(0)).toBe('ROJO')
  })
})

function paso(cumplimiento: RoadSafetyPesvPaso['cumplimiento']): RoadSafetyPesvPaso {
  return {
    fase: 'F1',
    paso: 1,
    elemento: 'Elemento de prueba',
    nivelAplicable: null,
    cumplimiento,
    porcentajeAvance: null,
    evidencia: null,
    observaciones: null,
  }
}

describe('buildPesvGlobalCompliance', () => {
  it('cuenta cada estado por separado y calcula pct = verde/total', () => {
    const pasos = [paso('Cumple'), paso('Cumple'), paso('Parcial'), paso('No cumple')]
    expect(buildPesvGlobalCompliance(pasos)).toEqual({ pct: 50, verde: 2, amarillo: 1, rojo: 1, total: 4 })
  })

  it('ignora pasos sin cumplimiento (null) al contar el total', () => {
    const pasos = [paso('Cumple'), paso(null)]
    expect(buildPesvGlobalCompliance(pasos)).toEqual({ pct: 100, verde: 1, amarillo: 0, rojo: 0, total: 1 })
  })

  it('arreglo vacío → total 0, pct 0 (no división por cero)', () => {
    expect(buildPesvGlobalCompliance([])).toEqual({ pct: 0, verde: 0, amarillo: 0, rojo: 0, total: 0 })
  })
})
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `cd frontend && npx vitest run src/utils/roadSafetyCompliance.test.ts`
Expected: FAIL — `Cannot find module './roadSafetyCompliance'` (el archivo no existe todavía).

- [ ] **Step 3: Crear el archivo de utilidad**

```ts
// frontend/src/utils/roadSafetyCompliance.ts
import type { CategoryCardStatus } from '@/types/dashboard'
import type { RoadSafetyPesvPaso } from '@/types/roadSafety'

/** Convención adoptada para esta feature (2026-08) — NO es un corte de la
 * Resolución 40595/2022, que no define esta escala. Confirmado con el
 * usuario en vez de inventado: ≥80% VERDE, 60-79% AMARILLO, <60% ROJO. */
export function classifyPesvCompliance(pct: number | null): CategoryCardStatus {
  if (pct == null) return 'SIN_DATOS'
  if (pct >= 80) return 'VERDE'
  if (pct >= 60) return 'AMARILLO'
  return 'ROJO'
}

/** Re-agrega los pasos PESV por su propio campo `cumplimiento` (ya
 * clasificado — 'Cumple'/'Parcial'/'No cumple' — no requiere ningún umbral
 * nuevo) para alimentar ComplianceRing — mismo shape que `GlobalCompliance`
 * (pct/verde/amarillo/rojo/total). Los pasos sin dato (`cumplimiento: null`)
 * se excluyen del conteo, igual que el resto del sistema trata "sin datos
 * todavía" como distinto de "en 0". */
export function buildPesvGlobalCompliance(pasos: RoadSafetyPesvPaso[]) {
  const verde = pasos.filter((p) => p.cumplimiento === 'Cumple').length
  const amarillo = pasos.filter((p) => p.cumplimiento === 'Parcial').length
  const rojo = pasos.filter((p) => p.cumplimiento === 'No cumple').length
  const total = verde + amarillo + rojo
  const pct = total > 0 ? Math.round((verde / total) * 100) : 0
  return { pct, verde, amarillo, rojo, total }
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

Run: `npx vitest run src/utils/roadSafetyCompliance.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/utils/roadSafetyCompliance.ts src/utils/roadSafetyCompliance.test.ts
git commit -m "feat: funciones puras de clasificación de cumplimiento PESV"
```

---

### Task 2: `RoadSafetyDashboardTab.vue` — reusar SummaryCard/ComplianceRing

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue`

**Interfaces:**
- Consumes: `classifyPesvCompliance`, `buildPesvGlobalCompliance` (Task 1); `SummaryCard.vue` (props: `titulo: string`, `valor: string`, `cumplimientoPct: number`, `estado: CategoryCardStatus`, `icon?: Component`); `ComplianceRing.vue` (prop: `compliance: GlobalCompliance`) — ambos ya existen, sin cambios.
- Produces: sin cambios de props/eventos del componente (`organizationId?: string`, `defineExpose({ reload })` se mantienen igual).

- [ ] **Step 1: Agregar los imports nuevos**

En `frontend/src/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue`, reemplazar:
```ts
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getRoadSafetyHoja1,
  getRoadSafetyHoja2,
  getRoadSafetyHoja3,
  getRoadSafetyHoja4,
  getRoadSafetyAlertas,
  getRoadSafetyUploadHistory,
  RoadSafetyRequestError,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyAlertasPanel } from '@/types/roadSafety'
```
por:
```ts
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getRoadSafetyHoja1,
  getRoadSafetyHoja2,
  getRoadSafetyHoja3,
  getRoadSafetyHoja4,
  getRoadSafetyAlertas,
  getRoadSafetyUploadHistory,
  RoadSafetyRequestError,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyAlertasPanel, RoadSafetyPesvPaso } from '@/types/roadSafety'
import SummaryCard from '../SummaryCard.vue'
import ComplianceRing from '../ComplianceRing.vue'
import { classifyPesvCompliance, buildPesvGlobalCompliance } from '@/utils/roadSafetyCompliance'
```

- [ ] **Step 2: Guardar los pasos PESV y derivar la dona con un `computed`**

Reemplazar:
```ts
const cumplimientoPesvGlobal = ref<number | null>(null)
const totalVehiculos = ref(0)
const totalConductores = ref(0)
const totalRutas = ref(0)
const alertas = ref<RoadSafetyAlertasPanel | null>(null)
const lastUpdated = ref<string | null>(null)
```
por:
```ts
const cumplimientoPesvGlobal = ref<number | null>(null)
const pesvPasos = ref<RoadSafetyPesvPaso[]>([])
const totalVehiculos = ref(0)
const totalConductores = ref(0)
const totalRutas = ref(0)
const alertas = ref<RoadSafetyAlertasPanel | null>(null)
const lastUpdated = ref<string | null>(null)

const pesvCompliance = computed(() => buildPesvGlobalCompliance(pesvPasos.value))
```

- [ ] **Step 3: Guardar `hoja1.pasos` en `load()`**

Reemplazar:
```ts
    cumplimientoPesvGlobal.value = hoja1.cumplimientoPesvGlobal
    totalVehiculos.value = hoja2.length
```
por:
```ts
    cumplimientoPesvGlobal.value = hoja1.cumplimientoPesvGlobal
    pesvPasos.value = hoja1.pasos
    totalVehiculos.value = hoja2.length
```

- [ ] **Step 4: Reemplazar la tarjeta hardcodeada de cumplimiento PESV por `SummaryCard`, y agregar `ComplianceRing`**

Reemplazar:
```html
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.cumplimientoPesv') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">
            {{ cumplimientoPesvGlobal != null ? `${cumplimientoPesvGlobal}%` : t('roadSafety.noData') }}
          </p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalVehiculos') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalVehiculos }}</p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalConductores') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalConductores }}</p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalRutas') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalRutas }}</p>
        </div>
      </div>
```
por:
```html
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          :titulo="t('roadSafety.dashboard.cumplimientoPesv')"
          :valor="cumplimientoPesvGlobal != null ? `${cumplimientoPesvGlobal}%` : t('roadSafety.noData')"
          :cumplimiento-pct="cumplimientoPesvGlobal ?? 0"
          :estado="classifyPesvCompliance(cumplimientoPesvGlobal)"
        />
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalVehiculos') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalVehiculos }}</p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalConductores') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalConductores }}</p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalRutas') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalRutas }}</p>
        </div>
      </div>

      <ComplianceRing :compliance="pesvCompliance" />
```

(El bloque de las 4 tarjetas de "Alertas" que sigue después, líneas 101-131 del archivo original, NO cambia — se deja tal cual.)

- [ ] **Step 5: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 6: Verificación manual mínima (sin test automatizado — es un componente que hace `Promise.all` de 6 llamadas HTTP, fuera de alcance montar un test de integración para este cambio puntual)**

Confirmar visualmente en navegador (parte de la verificación final, Task 5) que la tarjeta de cumplimiento PESV muestra el badge de color correcto y que la dona aparece debajo de las 4 tarjetas.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue
git commit -m "feat: Dashboard Admin de Seguridad Vial reutiliza SummaryCard/ComplianceRing"
```

---

### Task 3: `RoadSafetyHoja2Tab.vue` — reemplazar `ALERTA_CLASS` por `SEMAPHORE_STYLES`

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue`

**Interfaces:**
- Consumes: `SEMAPHORE_STYLES` de `@/utils/semaphoreStyles` (`Record<CategoryCardStatus, { dot, text, bg, border, accent }>`, ya existente).
- Produces: sin cambios de props/eventos.

**Nota de mapeo:** `SEMAPHORE_STYLES` está indexado por `CategoryCardStatus` (`VERDE`/`AMARILLO`/`ROJO`/`SIN_DATOS`/`SIN_NORMA`), no por `VehicleAlertState` (`OK`/`ALERTA`/`VENCIDO`). Se necesita un mapa de traducción local `VehicleAlertState → CategoryCardStatus` antes de indexar `SEMAPHORE_STYLES` — el valor de texto/badge (`OK`, `ALERTA`, `VENCIDO`) NO cambia, solo el color que lo pinta.

- [ ] **Step 1: Reemplazar el mapa de colores hardcodeado**

Reemplazar:
```ts
const ALERTA_CLASS: Record<string, string> = {
  OK: 'bg-emerald-50 text-emerald-700',
  ALERTA: 'bg-amber-50 text-amber-700',
  VENCIDO: 'bg-red-50 text-red-700',
}
```
por:
```ts
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'

/** VehicleAlertState → CategoryCardStatus, para reutilizar SEMAPHORE_STYLES
 * (mismos colores que ya tenía este archivo — bg-emerald-50/amber-50/red-50
 * — ahora desde una sola fuente de verdad compartida con Higiene Industrial). */
const ALERTA_STATUS: Record<RoadSafetyVehiculo['alerta'], CategoryCardStatus> = {
  OK: 'VERDE',
  ALERTA: 'AMARILLO',
  VENCIDO: 'ROJO',
}
```

(El `import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'` y `import type { CategoryCardStatus } from '@/types/dashboard'` van arriba, junto a los demás imports del bloque `<script setup>` — no dentro del bloque que reemplaza `ALERTA_CLASS`, sépalos correctamente al editar.)

- [ ] **Step 2: Actualizar el `:class` del badge en el template**

Reemplazar:
```html
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="ALERTA_CLASS[v.alerta]"
                >
                  {{ t(`roadSafety.alerta.vehiculo.${v.alerta}`) }}
                </span>
```
por:
```html
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="[SEMAPHORE_STYLES[ALERTA_STATUS[v.alerta]].bg, SEMAPHORE_STYLES[ALERTA_STATUS[v.alerta]].text]"
                >
                  {{ t(`roadSafety.alerta.vehiculo.${v.alerta}`) }}
                </span>
```

- [ ] **Step 3: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 4: Verificación visual del color (sin test automatizado — cambio puramente de estilo, cubierto por la verificación manual de Task 5)**

Confirmar que `bg-emerald-50 text-emerald-700` (antes) y `SEMAPHORE_STYLES.VERDE.bg + .text` (`bg-emerald-50 text-emerald-600`, después) — **nota: el tono de texto cambia de `-700` a `-600`** (ver `semaphoreStyles.ts`, es el tono que ya usa toda la app para este estado) — se ve prácticamente idéntico, diferencia de un solo nivel de saturación Tailwind, no perceptible como regresión.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue
git commit -m "refactor: Hoja 2 de Seguridad Vial usa SEMAPHORE_STYLES compartido"
```

---

### Task 4: `RoadSafetyHoja3Tab.vue` — mismo tratamiento

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue`

**Interfaces:**
- Consumes: mismos `SEMAPHORE_STYLES`/`CategoryCardStatus` de Task 3.
- Produces: sin cambios de props/eventos.

**Diferencia con Task 3:** el tercer estado se llama `LICENCIA_VENCIDA` (no `VENCIDO`) — mismo mapeo a `ROJO`.

- [ ] **Step 1: Reemplazar el mapa de colores hardcodeado**

Reemplazar (línea 40-43 del archivo actual):
```ts
const ALERTA_CLASS: Record<string, string> = {
  OK: 'bg-emerald-50 text-emerald-700',
  ALERTA: 'bg-amber-50 text-amber-700',
  LICENCIA_VENCIDA: 'bg-red-50 text-red-700',
}
```
por:
```ts
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'

/** DriverAlertState → CategoryCardStatus — mismo criterio que
 * RoadSafetyHoja2Tab.vue (ver ese archivo para el porqué). */
const ALERTA_STATUS: Record<RoadSafetyConductor['alerta'], CategoryCardStatus> = {
  OK: 'VERDE',
  ALERTA: 'AMARILLO',
  LICENCIA_VENCIDA: 'ROJO',
}
```

(Mismo criterio de ubicación de imports que Task 3, Step 1.)

- [ ] **Step 2: Actualizar el `:class` del badge en el template**

Reemplazar (línea ~195 del archivo actual):
```html
                  :class="ALERTA_CLASS[c.alerta]"
```
por:
```html
                  :class="[SEMAPHORE_STYLES[ALERTA_STATUS[c.alerta]].bg, SEMAPHORE_STYLES[ALERTA_STATUS[c.alerta]].text]"
```

(Dejar intacto el resto de ese `<span>` — clases estáticas, contenido, atributos — solo cambia el valor de `:class`.)

- [ ] **Step 3: Type-check**

Run: `npx vue-tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue
git commit -m "refactor: Hoja 3 de Seguridad Vial usa SEMAPHORE_STYLES compartido"
```

---

### Task 5: Verificación final de regresión

**Files:** ninguno (solo comandos + checklist manual).

- [ ] **Step 1: Suite completa de tests del frontend**

Run: `cd frontend && npm run test`
Expected: todos los tests pasan, incluido el archivo nuevo de Task 1 (10 tests) sumado a los preexistentes.

- [ ] **Step 2: Type-check completo (frontend + backend, backend no debería tener cambios)**

Run: `npx vue-tsc -b` (frontend)
Run: `cd ../backend && npm run typecheck` (sin cambios esperados — este plan no toca backend)

- [ ] **Step 3: Confirmar que el diff solo toca los archivos esperados**

Run: `git diff --stat <commit-antes-de-Task-1>..HEAD`
Expected: exactamente estos archivos — `frontend/src/utils/roadSafetyCompliance.ts` (nuevo), `frontend/src/utils/roadSafetyCompliance.test.ts` (nuevo), `frontend/src/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue`, `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue`, `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue`. Ningún archivo de backend, de Cliente, de Configuración, ni `DashboardShell.vue`/`CategoryTab.vue`.

- [ ] **Step 4: Checklist manual en navegador (`npm run dev`), ambos idiomas — recomendado antes de dar el trabajo por cerrado**

1. Higiene Industrial (Admin): Dashboard se ve y se comporta exactamente igual que antes — regresión visual cero.
2. Seguridad Vial (Admin) → pestaña Dashboard: tarjeta de cumplimiento PESV con badge de color (verde ≥80%, amarillo 60-79%, rojo <60%, gris "sin datos" si no hay carga todavía), dona de cumplimiento debajo de las 4 tarjetas, conteos y alertas sin cambio visual.
3. Seguridad Vial (Admin) → Hoja 2 (Vehículos): badges OK/ALERTA/VENCIDO con los mismos colores de siempre.
4. Seguridad Vial (Admin) → Hoja 3 (Conductores): badges OK/ALERTA/LICENCIA_VENCIDA con los mismos colores de siempre.
5. Cliente (ambos servicios): sin cambios — este plan no toca ningún archivo de Cliente.
