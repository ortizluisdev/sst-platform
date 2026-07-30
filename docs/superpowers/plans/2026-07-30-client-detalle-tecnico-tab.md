# Pestaña "Detalle técnico" en la vista cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans o ejecución directa. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar la vista cliente en 3 pestañas (Dashboard/Detalle técnico/Análisis), construyendo solo "Detalle técnico" con contenido real (las otras 2 quedan como placeholder), sin tocar absolutamente nada de la vista admin.

**Architecture:** Árbol de componentes nuevo y paralelo, exclusivo para `ClientDashboardView.vue` — cero componentes de pestañas compartidos con admin se modifican.

**Tech Stack:** Vue 3 + TypeScript + Tailwind (frontend), Fastify + Prisma (backend, extensión menor).

## Global Constraints

- **No modificar**: `DashboardShell.vue`, `ResumenTab.vue`, `CategoryTab.vue`, `ComparativoTab.vue`, `HistorialTab.vue`, `ReportesTab.vue`, `ComparisonTable.vue`, `DashboardSidebar.vue` (se puede REUTILIZAR sin cambios), `dashboardTabs.ts`, `HigieneIndustrialPanel.vue`, ni ninguna ruta/endpoint exclusivo de admin.
- Sin librerías nuevas — CSV vía Blob, PDF vía `window.print()`, íconos vía `lucide-vue-next` (ya instalado).
- `instrumento`/`incertidumbre` que sean `null` se muestran como "Pendiente" — nunca se inventan.
- Sin suite de tests automatizada — `npm run typecheck` + `npx vue-tsc -b` + verificación manual en navegador (desktop y mobile).
- No crear ningún commit sin que el usuario vea y confirme el mensaje exacto primero.

---

## Task 1: Backend — exponer `instrumento`/`incertidumbre` en el dashboard

**Files:**
- Modify: `backend/src/modules/variables/variables.service.ts`

- [ ] **Step 1: Agregar los 2 campos al tipo y al retorno de `buildVariableSummary`**

Ubica `buildVariableSummary`'s `definition` parameter (ya tiene `tipo: VariableMeasurementType | null` agregado en un cambio anterior). Agrega:

```typescript
    tipo: VariableMeasurementType | null
    instrumento: string | null
    incertidumbre: string | null
```

Y en el `return`, junto a `tipo: definition.tipo,`:

```typescript
    tipo: definition.tipo,
    instrumento: definition.instrumento,
    incertidumbre: definition.incertidumbre,
```

- [ ] **Step 2: Mismo agregado en `buildEmptyVariableSummary`**

Mismo patrón: agregar `instrumento: string | null` e `incertidumbre: string | null` al parámetro y al retorno.

- [ ] **Step 3: Typecheck**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend && npm run typecheck
```

Expected: cero errores (las queries del repositorio ya traen la fila completa de `VariableDefinition`, incluidos estos 2 campos).

---

## Task 2: Frontend — tipos + componentes nuevos de la vista cliente

**Files:**
- Modify: `frontend/src/types/dashboard.ts` (agregar `instrumento`/`incertidumbre` a `VariableSummary`)
- Create: `frontend/src/components/dashboard/client/ClientDashboardShell.vue`
- Create: `frontend/src/components/dashboard/client/ClientDashboardTab.vue`
- Create: `frontend/src/components/dashboard/client/ClientDetalleTecnicoTab.vue`
- Create: `frontend/src/components/dashboard/client/ClientAnalisisTab.vue`
- Modify: `frontend/src/modules/dashboard/views/ClientDashboardView.vue` (usar el shell nuevo)
- Modify: `frontend/src/i18n/locales/es.json`, `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Agregar campos al tipo `VariableSummary`**

En `frontend/src/types/dashboard.ts`, agrega a la interfaz `VariableSummary` (junto al campo `tipo` ya existente):

```typescript
  instrumento: string | null
  incertidumbre: string | null
```

- [ ] **Step 2: Crear `ClientDashboardShell.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { LayoutDashboard, Table2, LineChart } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { DashboardData, UploadHistoryEntry, UploadDetail } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import DashboardSidebar from '../DashboardSidebar.vue'
import ClientDashboardTab from './ClientDashboardTab.vue'
import ClientDetalleTecnicoTab from './ClientDetalleTecnicoTab.vue'
import ClientAnalisisTab from './ClientAnalisisTab.vue'

defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchUploadDetail: (uploadId: string) => Promise<UploadDetail>
}>()

const { t } = useI18n()
const activeTab = defineModel<string>('activeTab', { default: 'dashboard' })

const tabs = computed<TabDef[]>(() => [
  { key: 'dashboard', label: t('dashboard.clientTabs.dashboard'), icon: LayoutDashboard },
  { key: 'detalleTecnico', label: t('dashboard.clientTabs.detalleTecnico'), icon: Table2 },
  { key: 'analisis', label: t('dashboard.clientTabs.analisis'), icon: LineChart },
])
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
    <DashboardSidebar v-model="activeTab" :tabs="tabs" />

    <div>
      <ClientDashboardTab v-if="activeTab === 'dashboard'" :dashboard="dashboard" />
      <ClientDetalleTecnicoTab v-else-if="activeTab === 'detalleTecnico'" :dashboard="dashboard" />
      <ClientAnalisisTab v-else-if="activeTab === 'analisis'" />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Crear los 2 placeholders `ClientDashboardTab.vue` y `ClientAnalisisTab.vue`**

`frontend/src/components/dashboard/client/ClientDashboardTab.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DashboardData } from '@/types/dashboard'

defineProps<{ dashboard: DashboardData }>()
const { t } = useI18n()
</script>

<template>
  <div class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700">
    {{ t('dashboard.clientTabs.comingSoon') }}
  </div>
</template>
```

`frontend/src/components/dashboard/client/ClientAnalisisTab.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700">
    {{ t('dashboard.clientTabs.comingSoon') }}
  </div>
</template>
```

- [ ] **Step 4: Crear `ClientDetalleTecnicoTab.vue`**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DashboardData, VariableSummary } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import { categoryIcon } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

const TIPO_LABEL: Record<string, string> = { MEDICION: 'M', CALCULO: 'C', INSPECCION: 'I' }
const TIPO_BADGE: Record<string, string> = {
  MEDICION: 'bg-sky-100 text-sky-700 border-sky-300',
  CALCULO: 'bg-violet-100 text-violet-700 border-violet-300',
  INSPECCION: 'bg-amber-100 text-amber-700 border-amber-300',
}

function instrumentoDe(variables: VariableSummary[]): string {
  const conDato = variables.find((v) => v.instrumento)
  return conDato?.instrumento ?? t('dashboard.detalleTecnico.pendiente')
}

function formatNorma(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} – ${max}`
  if (max != null) return `≤ ${max}`
  if (min != null) return `≥ ${min}`
  return '—'
}

function escapeCsv(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function exportCsv() {
  const headers = ['Categoría', 'Parámetro', 'Resultado', 'Unidad', 'Tipo', 'Incertidumbre', 'Norma/Ref']
  const rows: string[] = [headers.join(',')]
  for (const categoria of props.dashboard.categories) {
    for (const v of categoria.variables) {
      rows.push(
        [
          categoria.categoria,
          v.nombre,
          v.promedio,
          v.unidadMedida,
          v.tipo ? TIPO_LABEL[v.tipo] : t('dashboard.detalleTecnico.pendiente'),
          v.incertidumbre ?? t('dashboard.detalleTecnico.pendiente'),
          formatNorma(v.limiteMin, v.limiteMax),
        ]
          .map(escapeCsv)
          .join(','),
      )
    }
  }
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const fecha = props.dashboard.lastUpdated?.slice(0, 10) ?? 'sin-fecha'
  const link = document.createElement('a')
  link.href = url
  link.download = `detalle-tecnico-${props.dashboard.service.slug}-${fecha}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        class="rounded-sm border border-navy-900 bg-navy-900 px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-transparent hover:text-navy-900"
        @click="exportCsv"
      >
        {{ t('dashboard.detalleTecnico.exportCsv') }}
      </button>
      <button
        type="button"
        class="rounded-sm border border-navy-900 px-5 py-2.5 text-sm font-medium text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
        @click="printReport"
      >
        {{ t('dashboard.detalleTecnico.exportPdf') }}
      </button>
    </div>

    <div v-for="categoria in dashboard.categories" :key="categoria.categoria" class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="flex items-center gap-2 border-b border-line-strong bg-sky-100 px-4 py-3">
        <component :is="categoryIcon(categoria.categoria)" class="h-4.5 w-4.5 shrink-0 text-navy-700" aria-hidden="true" />
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-700">{{ categoryLabel(categoria.categoria, locale as Locale) }}</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase tracking-wide text-navy-700 opacity-70">
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.parametro') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.resultado') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.tipo') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.incertidumbre') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.norma') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in categoria.variables" :key="v.definitionId" class="border-t border-line">
              <td class="px-4 py-3 text-navy-900">{{ v.nombre }}</td>
              <td class="px-4 py-3 font-mono text-navy-900">{{ v.promedio }} {{ v.unidadMedida }}</td>
              <td class="px-4 py-3">
                <span
                  v-if="v.tipo"
                  :class="TIPO_BADGE[v.tipo]"
                  class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                >
                  {{ TIPO_LABEL[v.tipo] }}
                </span>
                <span v-else class="text-navy-700 opacity-40">{{ t('dashboard.detalleTecnico.pendiente') }}</span>
              </td>
              <td class="px-4 py-3 text-navy-700">
                {{ v.incertidumbre ?? t('dashboard.detalleTecnico.pendiente') }}
              </td>
              <td class="px-4 py-3 text-navy-700">{{ v.normativaRef ?? formatNorma(v.limiteMin, v.limiteMax) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="border-t border-line-strong bg-cream px-4 py-2 text-xs text-navy-700 opacity-70">
        {{ t('dashboard.detalleTecnico.instrumentoPrefix') }}{{ instrumentoDe(categoria.variables) }}
      </p>
    </div>
  </div>
</template>
```

**Nota para quien implemente:** confirma la firma real de `categoryIcon` (¿es función `categoryIcon(categoria: string)` o un objeto/mapa como en `dashboardTabs.ts` que usa `iconForCategory`?) leyendo `frontend/src/utils/categoryIcon.ts` antes de este paso — ajusta el nombre de la función importada si difiere (el archivo real puede llamarse `iconForCategory`, no `categoryIcon`).

- [ ] **Step 5: Modificar `ClientDashboardView.vue` para usar el shell nuevo**

Reemplaza el import y uso de `DashboardShell` por `ClientDashboardShell`:

```typescript
import ClientDashboardShell from '@/components/dashboard/client/ClientDashboardShell.vue'
```

Y en el template, cambia `<DashboardShell ... />` por `<ClientDashboardShell ... />` (mismos props: `dashboard`, `fetch-history`, `fetch-upload-detail`).

- [ ] **Step 6: Agregar claves de i18n**

En `frontend/src/i18n/locales/es.json`, agrega un nuevo bloque de nivel superior `clientTabs` y `detalleTecnico` dentro de `dashboard`:

```json
    "clientTabs": {
      "dashboard": "Dashboard",
      "detalleTecnico": "Detalle técnico",
      "analisis": "Análisis",
      "comingSoon": "Próximamente."
    },
    "detalleTecnico": {
      "parametro": "Parámetro",
      "resultado": "Resultado",
      "tipo": "Tipo",
      "incertidumbre": "Incertidumbre",
      "norma": "Norma/Ref",
      "pendiente": "Pendiente",
      "instrumentoPrefix": "Instrumento: ",
      "exportCsv": "Exportar CSV",
      "exportPdf": "Exportar PDF"
    },
```

Mismo bloque en `frontend/src/i18n/locales/en.json`, traducido:

```json
    "clientTabs": {
      "dashboard": "Dashboard",
      "detalleTecnico": "Technical detail",
      "analisis": "Analysis",
      "comingSoon": "Coming soon."
    },
    "detalleTecnico": {
      "parametro": "Parameter",
      "resultado": "Result",
      "tipo": "Type",
      "incertidumbre": "Uncertainty",
      "norma": "Standard/Ref",
      "pendiente": "Pending",
      "instrumentoPrefix": "Instrument: ",
      "exportCsv": "Export CSV",
      "exportPdf": "Export PDF"
    },
```

- [ ] **Step 7: Verificar paridad de i18n**

```bash
cd /home/laortiz937/Documentos/sst-platform
python3 -c "
import json
def keys(d, prefix=''):
    out = set()
    for k, v in d.items():
        p = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out |= keys(v, p)
        else:
            out.add(p)
    return out
es = json.load(open('frontend/src/i18n/locales/es.json'))
en = json.load(open('frontend/src/i18n/locales/en.json'))
ke, kn = keys(es), keys(en)
print('only in es:', ke - kn)
print('only in en:', kn - ke)
print('OK' if ke == kn else 'MISMATCH')
"
```

Expected: `OK`.

- [ ] **Step 8: Typecheck**

```bash
cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b
```

Expected: cero errores.

---

## Task 3: Checkpoint — verificación en navegador (cliente y admin, desktop + mobile)

**Files:** ninguno.

- [ ] **Step 1: Confirmar que admin sigue exactamente igual**

Login como super-admin, ir a Operación → Higiene Industrial. Confirmar que el panel se ve y funciona exactamente como antes (mismas pestañas: Dashboard/Iluminación/Sonido/.../Comparativo Normativo/Historial/Reportes, formulario de carga intacto).

- [ ] **Step 2: Confirmar la vista cliente nueva**

Login como cliente (`1000000003` / `Organizacion123**`). Confirmar 3 pestañas: Dashboard (placeholder), Detalle técnico (5 categorías con datos reales, tipo/incertidumbre/instrumento correctos), Análisis (placeholder).

- [ ] **Step 3: Confirmar exportación CSV/PDF**

Click en "Exportar CSV" y "Exportar PDF" en Detalle técnico — confirmar que ambos generan una descarga/diálogo de impresión sin error de consola.

- [ ] **Step 4: Mobile**

Repetir el Step 2 en viewport 375×812 — confirmar que el menú de navegación (hamburguesa) y las tablas responsive (scroll horizontal) funcionan igual que en el resto del dashboard.
