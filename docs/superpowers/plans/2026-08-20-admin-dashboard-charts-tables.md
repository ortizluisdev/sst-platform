# Dashboard admin — tarjetas compactas, donuts, tendencia y tabla Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing admin general dashboard (`AdminDashboardView.vue`) from plain count cards to a fuller professional layout: compact cards, two donut charts, a monthly-registrations bar chart, and a read-only company table — reusing existing components/data wherever possible.

**Architecture:** One small, additive backend change (expose `Organization.createdAt` on an existing endpoint response) feeds a new pure aggregation function. Two new small Chart.js-based Vue components are added (a generic donut, a generic monthly bar chart); one existing component (`ComplianceRing.vue`) is reused unmodified. The dashboard view is rewritten to compose all of this — no new endpoints, no schema changes.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Chart.js + vue-chartjs (already installed), vue-i18n, Tailwind, Fastify + Prisma, Vitest.

## Global Constraints

- No new backend endpoints, no Prisma schema/migration changes — `Organization.createdAt` already exists as a column; this only adds it to an existing `select`/response.
- "Clientes por servicio" and "estado de cuentas" donuts must plot **exactly** the same numbers the existing cards show — never a second, diverging source of truth.
- New i18n keys for this screen's own copy (table headers, section titles) are **not** aliased to `clients.*`/`organizations.list.table.*` — this screen owns its copy independently, even where the visible text is similar. The one exception, made deliberately for genuinely identical vocabulary: the account-status **badge text** in the new table reuses the existing `organizations.list.responsableStatus.*` keys (the same 3-state label already shown on the "Clientes" screen), and `organizations.form.nit` for the "NIT" label prefix.
- Every new user-facing string needs both `frontend/src/i18n/locales/es.json` and `frontend/src/i18n/locales/en.json` entries (same key).
- The new company table is read-only — no edit/suspend/delete actions (those stay exclusive to the "Clientes" screen).
- No drill-down/clickable navigation from the donuts or the bar chart.

---

### Task 1: Backend — expose `Organization.createdAt` on `listFull()`

**Files:**
- Modify: `backend/src/modules/organizations/organizations.repository.ts:27-57` (the `listFull` method)
- Modify: `backend/src/modules/organizations/organizations.service.ts:65-77` (the `list` method)

**Interfaces:**
- Consumes: nothing new — `Organization.createdAt` already exists in `prisma/schema.prisma:141` (`createdAt DateTime @default(now()) @map("created_at")`).
- Produces: the JSON response of `GET /api/admin/organizations/full` now includes `"createdAt": "<ISO 8601 string>"` per organization. Task 2 consumes this as a new required field on the frontend `OrganizationListItem` type.

- [ ] **Step 1: Add `createdAt: true` to the repository's select**

In `backend/src/modules/organizations/organizations.repository.ts`, find this exact block:

```ts
    listFull(options?: { deletedOnly?: boolean }) {
      return prisma.organization.findMany({
        where: { deletedAt: options?.deletedOnly ? { not: null } : null },
        select: {
          id: true,
          nombre: true,
          nit: true,
          contactEmail: true,
          isActive: true,
          primaryColor: true,
          secondaryColor: true,
```

Replace with:

```ts
    listFull(options?: { deletedOnly?: boolean }) {
      return prisma.organization.findMany({
        where: { deletedAt: options?.deletedOnly ? { not: null } : null },
        select: {
          id: true,
          nombre: true,
          nit: true,
          contactEmail: true,
          isActive: true,
          createdAt: true,
          primaryColor: true,
          secondaryColor: true,
```

- [ ] **Step 2: Map `createdAt` in the service's response shape**

In `backend/src/modules/organizations/organizations.service.ts`, find this exact block:

```ts
    async list(options?: { deletedOnly?: boolean }) {
      const organizations = await repository.listFull(options)
      return organizations.map((org) => ({
        id: org.id,
        nombre: org.nombre,
        nit: org.nit,
        contactEmail: org.contactEmail,
        isActive: org.isActive,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        services: org.services.map((s) => ({ slug: s.service.slug, nombre: s.service.nombre, isActive: s.isActive })),
        responsable: org.users[0]?.user ?? null,
      }))
    },
```

Replace with:

```ts
    async list(options?: { deletedOnly?: boolean }) {
      const organizations = await repository.listFull(options)
      return organizations.map((org) => ({
        id: org.id,
        nombre: org.nombre,
        nit: org.nit,
        contactEmail: org.contactEmail,
        isActive: org.isActive,
        createdAt: org.createdAt.toISOString(),
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        services: org.services.map((s) => ({ slug: s.service.slug, nombre: s.service.nombre, isActive: s.isActive })),
        responsable: org.users[0]?.user ?? null,
      }))
    },
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 4: Manual verification against the running dev server**

There is no existing test file for the `organizations` module (`find backend/src/modules/organizations -name "*.test.ts"` returns nothing) — this small additive field does not warrant introducing new backend test scaffolding on its own. Verify manually instead:

Run (backend dev server must be running on port 3000 — `cd backend && npm run dev` in another terminal if not already up):

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"documentNumber":"1000000001","password":"'"$SEED_SUPERADMIN_PASSWORD"'"}' \
  -c /tmp/admin-cookie.txt -o /dev/null -w "login: %{http_code}\n"
curl -s http://localhost:3000/api/admin/organizations/full -b /tmp/admin-cookie.txt | head -c 500
```

(`$SEED_SUPERADMIN_PASSWORD` is in `backend/.env` — read it with `grep SEED_SUPERADMIN_PASSWORD backend/.env` if the env var isn't exported in your shell.)

Expected: `login: 200`, and the JSON response for at least one organization includes a `"createdAt"` field formatted as an ISO 8601 string (e.g. `"createdAt":"2026-08-02T13:49:38.531Z"`).

- [ ] **Step 5: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add backend/src/modules/organizations/organizations.repository.ts backend/src/modules/organizations/organizations.service.ts
git commit -m "feat: exponer fecha de registro de empresa en listado admin"
```

---

### Task 2: Frontend — `OrganizationListItem.createdAt` type + fixture update

**Files:**
- Modify: `frontend/src/types/organization.ts:77-88` (the `OrganizationListItem` interface)
- Modify: `frontend/src/utils/adminDashboardStats.test.ts:5-26` (the `makeOrg()` test factory)

**Interfaces:**
- Consumes: Task 1's new backend field (same field name, `createdAt`, as an ISO 8601 string).
- Produces: `OrganizationListItem.createdAt: string` — Task 4's `computeMonthlyRegistrations` reads this field.

- [ ] **Step 1: Add the field to the type**

In `frontend/src/types/organization.ts`, find this exact block:

```ts
export interface OrganizationListItem {
  id: string
  nombre: string
  nit: string | null
  contactEmail: string | null
  isActive: boolean
  primaryColor: string | null
  secondaryColor: string | null
  services: OrganizationContractedService[]
  responsable: OrganizationResponsable | null
}
```

Replace with:

```ts
export interface OrganizationListItem {
  id: string
  nombre: string
  nit: string | null
  contactEmail: string | null
  isActive: boolean
  /** ISO 8601 — fecha de alta de la empresa (Organization.createdAt en el
   * backend). Alimenta la tendencia de registros mensuales del dashboard
   * general de admin (adminDashboardStats.ts). */
  createdAt: string
  primaryColor: string | null
  secondaryColor: string | null
  services: OrganizationContractedService[]
  responsable: OrganizationResponsable | null
}
```

- [ ] **Step 2: Fix the now-incomplete test fixture**

Adding a required field to `OrganizationListItem` breaks `frontend/src/utils/adminDashboardStats.test.ts`'s `makeOrg()` factory (it will fail to typecheck — missing property). In `frontend/src/utils/adminDashboardStats.test.ts`, find this exact block:

```ts
function makeOrg(overrides: Partial<OrganizationListItem> = {}): OrganizationListItem {
  return {
    id: 'org-1',
    nombre: 'Empresa 1',
    nit: '900123456',
    contactEmail: 'contacto@empresa1.com',
    isActive: true,
    primaryColor: null,
    secondaryColor: null,
    services: [],
```

Replace with:

```ts
function makeOrg(overrides: Partial<OrganizationListItem> = {}): OrganizationListItem {
  return {
    id: 'org-1',
    nombre: 'Empresa 1',
    nit: '900123456',
    contactEmail: 'contacto@empresa1.com',
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    primaryColor: null,
    secondaryColor: null,
    services: [],
```

- [ ] **Step 3: Typecheck and run the existing tests**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output (clean).

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vitest run src/utils/adminDashboardStats.test.ts`
Expected: PASS — the existing 6 tests still pass (the new field doesn't change any of their assertions, `makeOrg()` just has a valid default now).

- [ ] **Step 4: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/types/organization.ts frontend/src/utils/adminDashboardStats.test.ts
git commit -m "feat: agregar createdAt al tipo OrganizationListItem"
```

---

### Task 3: i18n keys for the new sections

**Files:**
- Modify: `frontend/src/i18n/locales/es.json:973-986` (the `dashboard.adminGeneralDashboard` block)
- Modify: `frontend/src/i18n/locales/en.json:973-986` (the same block, English)

**Interfaces:**
- Consumes: nothing.
- Produces: i18n keys `dashboard.adminGeneralDashboard.monthlyRegistrationsTitle`, `.organizationsTableTitle`, `.table.nombre`, `.table.servicios`, `.table.estado` — Task 7 (the view) reads these exact keys.

- [ ] **Step 1: es.json**

Find this exact block:

```json
    "adminGeneralDashboard": {
      "pageTitle": "Dashboard",
      "resumenTitle": "Resumen",
      "clientesRegistrados": "Clientes registrados",
      "serviciosActivos": "Servicios activos",
      "clientesPorServicioTitle": "Clientes por servicio",
      "clientesDeServicio": "Clientes — {service}",
      "accountStatusTitle": "Estado de cuentas",
      "accountStatus": {
        "ACTIVE": "Activas",
        "PENDING_ACTIVATION": "Pendientes de activación",
        "SUSPENDED": "Suspendidas"
      }
    }
  },
```

Replace with:

```json
    "adminGeneralDashboard": {
      "pageTitle": "Dashboard",
      "resumenTitle": "Resumen",
      "clientesRegistrados": "Clientes registrados",
      "serviciosActivos": "Servicios activos",
      "clientesPorServicioTitle": "Clientes por servicio",
      "clientesDeServicio": "Clientes — {service}",
      "accountStatusTitle": "Estado de cuentas",
      "accountStatus": {
        "ACTIVE": "Activas",
        "PENDING_ACTIVATION": "Pendientes de activación",
        "SUSPENDED": "Suspendidas"
      },
      "monthlyRegistrationsTitle": "Clientes nuevos por mes",
      "organizationsTableTitle": "Listado de empresas",
      "table": {
        "nombre": "Empresa",
        "servicios": "Servicios contratados",
        "estado": "Estado de cuenta"
      }
    }
  },
```

- [ ] **Step 2: en.json**

Find this exact block:

```json
    "adminGeneralDashboard": {
      "pageTitle": "Dashboard",
      "resumenTitle": "Overview",
      "clientesRegistrados": "Registered clients",
      "serviciosActivos": "Active services",
      "clientesPorServicioTitle": "Clients by service",
      "clientesDeServicio": "Clients — {service}",
      "accountStatusTitle": "Account status",
      "accountStatus": {
        "ACTIVE": "Active",
        "PENDING_ACTIVATION": "Pending activation",
        "SUSPENDED": "Suspended"
      }
    }
  },
```

Replace with:

```json
    "adminGeneralDashboard": {
      "pageTitle": "Dashboard",
      "resumenTitle": "Overview",
      "clientesRegistrados": "Registered clients",
      "serviciosActivos": "Active services",
      "clientesPorServicioTitle": "Clients by service",
      "clientesDeServicio": "Clients — {service}",
      "accountStatusTitle": "Account status",
      "accountStatus": {
        "ACTIVE": "Active",
        "PENDING_ACTIVATION": "Pending activation",
        "SUSPENDED": "Suspended"
      },
      "monthlyRegistrationsTitle": "New clients per month",
      "organizationsTableTitle": "Company list",
      "table": {
        "nombre": "Company",
        "servicios": "Contracted services",
        "estado": "Account status"
      }
    }
  },
```

- [ ] **Step 3: Verify JSON validity and typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/es.json', 'utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: claves i18n de tendencia mensual y tabla en dashboard admin"
```

---

### Task 4: `computeMonthlyRegistrations` pure function + tests

**Files:**
- Modify: `frontend/src/utils/adminDashboardStats.ts` (add function + type at the end)
- Modify: `frontend/src/utils/adminDashboardStats.test.ts` (add a new `describe` block)

**Interfaces:**
- Consumes: `OrganizationListItem` (with `createdAt: string`, from Task 2).
- Produces: `computeMonthlyRegistrations(organizations, months?, now?): MonthlyRegistrationCount[]` and the exported type `MonthlyRegistrationCount { label: string; count: number }` — Task 7 (the view) and Task 6 (`MonthlyCountChart.vue`) both import these exact names.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/utils/adminDashboardStats.test.ts`, add this new `describe` block at the end of the file (after the existing `computeAdminDashboardStats` describe block, before the final newline):

```ts
describe('computeMonthlyRegistrations', () => {
  const NOW = new Date('2026-08-20T12:00:00.000Z')

  it('devuelve 6 meses en orden cronológico, más reciente al final', () => {
    const result = computeMonthlyRegistrations([], 6, NOW)
    expect(result.map((r) => r.label)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'])
  })

  it('sin organizaciones, todos los meses en 0', () => {
    const result = computeMonthlyRegistrations([], 6, NOW)
    expect(result.every((r) => r.count === 0)).toBe(true)
  })

  it('cuenta organizaciones creadas en meses distintos', () => {
    const orgs = [
      makeOrg({ id: 'a', createdAt: '2026-08-02T13:49:38.531Z' }),
      makeOrg({ id: 'b', createdAt: '2026-08-09T14:20:13.400Z' }),
      makeOrg({ id: 'c', createdAt: '2026-06-15T00:00:00.000Z' }),
    ]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.count]))
    expect(byLabel['2026-08']).toBe(2)
    expect(byLabel['2026-06']).toBe(1)
    expect(byLabel['2026-07']).toBe(0)
  })

  it('organización creada el primer día del mes cae en ese mes', () => {
    const orgs = [makeOrg({ id: 'a', createdAt: '2026-07-01T00:00:00.000Z' })]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.count]))
    expect(byLabel['2026-07']).toBe(1)
  })

  it('organización creada el último día del mes (justo antes de medianoche UTC) cae en ese mes', () => {
    const orgs = [makeOrg({ id: 'a', createdAt: '2026-07-31T23:59:59.999Z' })]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.count]))
    expect(byLabel['2026-07']).toBe(1)
  })

  it('organización creada antes del rango de 6 meses no se cuenta en ningún bucket', () => {
    const orgs = [makeOrg({ id: 'a', createdAt: '2025-01-01T00:00:00.000Z' })]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    expect(result.every((r) => r.count === 0)).toBe(true)
  })
})
```

Also update the import at the top of the file — find:

```ts
import { computeAdminDashboardStats } from './adminDashboardStats'
```

Replace with:

```ts
import { computeAdminDashboardStats, computeMonthlyRegistrations } from './adminDashboardStats'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vitest run src/utils/adminDashboardStats.test.ts`
Expected: FAIL — `computeMonthlyRegistrations` is not exported from `./adminDashboardStats` (TypeScript/import error, or "is not a function" at runtime).

- [ ] **Step 3: Write the implementation**

In `frontend/src/utils/adminDashboardStats.ts`, add this at the end of the file (after the existing `computeAdminDashboardStats` function):

```ts
export interface MonthlyRegistrationCount {
  /** 'YYYY-MM' — clave estable, sin depender de locale. El componente que
   * la muestra (MonthlyCountChart.vue) es responsable de traducirla a un
   * texto localizado ("ago 2026" / "Aug 2026"). */
  label: string
  count: number
}

/**
 * Tendencia de clientes nuevos por mes, para el dashboard general de admin
 * (2026-08, "tablas gráficas y mucho más"). Trabaja enteramente en UTC (no
 * en hora local) — tanto para generar los 6 buckets de mes como para leer
 * `createdAt` de cada organización — para que un caso límite como "creado
 * el último día del mes a las 23:59" caiga siempre en el mismo bucket sin
 * importar en qué zona horaria corra el proceso (servidor, CI, o la
 * máquina de quien lo pruebe localmente).
 */
export function computeMonthlyRegistrations(
  organizations: OrganizationListItem[],
  months = 6,
  now: Date = new Date(),
): MonthlyRegistrationCount[] {
  const buckets: MonthlyRegistrationCount[] = []
  for (let i = months - 1; i >= 0; i--) {
    const bucketDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const label = `${bucketDate.getUTCFullYear()}-${String(bucketDate.getUTCMonth() + 1).padStart(2, '0')}`
    buckets.push({ label, count: 0 })
  }

  const indexByLabel = new Map(buckets.map((bucket, index) => [bucket.label, index]))
  for (const org of organizations) {
    const created = new Date(org.createdAt)
    const label = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, '0')}`
    const index = indexByLabel.get(label)
    if (index !== undefined) buckets[index]!.count++
  }

  return buckets
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vitest run src/utils/adminDashboardStats.test.ts`
Expected: PASS — 12 tests total (the existing 6 plus the 6 new ones).

- [ ] **Step 5: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/utils/adminDashboardStats.ts frontend/src/utils/adminDashboardStats.test.ts
git commit -m "feat: agregados de tendencia mensual de clientes nuevos"
```

---

### Task 5: `ServiceDistributionDonut.vue` — generic donut chart

**Files:**
- Create: `frontend/src/components/dashboard/ServiceDistributionDonut.vue`

**Interfaces:**
- Consumes: `CHART_TOOLTIP_STYLE` from `@/utils/chartTheme` (existing); `dashboard.complianceRing.noData` i18n key (existing, already used by `ComplianceRing.vue`).
- Produces: component with prop `slices: { label: string; value: number; color: string }[]` — Task 7 passes this.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/dashboard/ServiceDistributionDonut.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'

ChartJS.register(ArcElement, Tooltip)

export interface DonutSlice {
  label: string
  value: number
  /** Hex — Chart.js no acepta clases de Tailwind, necesita el string literal. */
  color: string
}

const props = defineProps<{ slices: DonutSlice[] }>()
const { t } = useI18n()

const total = computed(() => props.slices.reduce((sum, slice) => sum + slice.value, 0))
/** Sin datos, un donut vacío (todas las porciones en 0) se lee como "algo
 * falló" en vez de "todavía no hay nada que mostrar" — mismo criterio que
 * ComplianceRing.vue. */
const hasData = computed(() => total.value > 0)

const chartData = computed(() => ({
  labels: props.slices.map((slice) => slice.label),
  datasets: [
    {
      data: props.slices.map((slice) => slice.value),
      backgroundColor: props.slices.map((slice) => slice.color),
      borderWidth: 0,
      borderRadius: 6,
      spacing: 3,
    },
  ],
}))

const chartOptions = {
  cutout: '72%',
  maintainAspectRatio: false,
  animation: { animateRotate: true, duration: 700, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...CHART_TOOLTIP_STYLE,
      callbacks: { label: (ctx: { label: string; parsed: number }) => ` ${ctx.label}: ${ctx.parsed}` },
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-4 sm:p-5">
    <div class="relative mx-auto h-[150px] w-[150px] sm:h-[170px] sm:w-[170px]">
      <div class="absolute inset-3 rounded-full bg-navy-900/[0.03] blur-md" aria-hidden="true" />
      <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full w-full rounded-full border-[10px] border-line-strong" />
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span v-if="hasData" class="font-serif text-3xl font-semibold text-navy-900">{{ total }}</span>
        <span v-else class="font-serif text-lg font-semibold text-navy-700 opacity-70">{{
          t('dashboard.complianceRing.noData')
        }}</span>
      </div>
    </div>
    <ul v-if="hasData" class="mt-4 flex flex-col gap-1.5 text-xs">
      <li v-for="slice in slices" :key="slice.label" class="flex items-center justify-between gap-2">
        <span class="flex min-w-0 items-center gap-1.5 truncate text-navy-700">
          <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: slice.color }" aria-hidden="true" />
          <span class="truncate">{{ slice.label }}</span>
        </span>
        <span class="shrink-0 font-semibold text-navy-900">{{ slice.value }}</span>
      </li>
    </ul>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/components/dashboard/ServiceDistributionDonut.vue
git commit -m "feat: componente de donut genérico para distribuciones del dashboard"
```

---

### Task 6: `MonthlyCountChart.vue` — generic monthly bar chart

**Files:**
- Create: `frontend/src/components/dashboard/MonthlyCountChart.vue`

**Interfaces:**
- Consumes: `MonthlyRegistrationCount` type from `@/utils/adminDashboardStats` (Task 4); `CHART_PALETTE`, `CHART_TOOLTIP_STYLE` from `@/utils/chartTheme` (existing); `Locale` type from `@/i18n` (existing).
- Produces: component with prop `data: MonthlyRegistrationCount[]` — Task 7 passes this.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/dashboard/MonthlyCountChart.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import type { MonthlyRegistrationCount } from '@/utils/adminDashboardStats'
import { CHART_PALETTE, CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'
import type { Locale } from '@/i18n'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ data: MonthlyRegistrationCount[] }>()
const { locale } = useI18n()

/** 'YYYY-MM' → "ago 2026" / "Aug 2026" — `timeZone: 'UTC'` fijo para que el
 * mes mostrado no dependa de la zona horaria del navegador, mismo motivo
 * por el que computeMonthlyRegistrations trabaja en UTC (ver adminDashboardStats.ts). */
function monthLabel(label: string): string {
  const date = new Date(`${label}-01T00:00:00Z`)
  return new Intl.DateTimeFormat(locale.value as Locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  )
}

const chartData = computed(() => ({
  labels: props.data.map((point) => monthLabel(point.label)),
  datasets: [
    {
      data: props.data.map((point) => point.count),
      backgroundColor: CHART_PALETTE.sky400,
      borderRadius: 4,
      maxBarThickness: 40,
    },
  ],
}))

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: CHART_TOOLTIP_STYLE,
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: CHART_PALETTE.navy700 } },
    // stepSize: 1 — los conteos son enteros pequeños, sin esto Chart.js
    // podía elegir marcas fraccionarias ("1.5 clientes") en el eje Y.
    y: { beginAtZero: true, ticks: { stepSize: 1, color: CHART_PALETTE.navy700 }, grid: { color: CHART_PALETTE.line } },
  },
}
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-4 sm:p-5">
    <div class="h-48 sm:h-56">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/components/dashboard/MonthlyCountChart.vue
git commit -m "feat: componente de barras mensuales genérico para el dashboard"
```

---

### Task 7: Rewrite `AdminDashboardView.vue` — compact cards, donuts, chart, table

**Files:**
- Modify: `frontend/src/modules/dashboard/views/AdminDashboardView.vue` (full rewrite)

**Interfaces:**
- Consumes: `computeAdminDashboardStats`, `computeMonthlyRegistrations`, `ResponsableAccountStatus` from `@/utils/adminDashboardStats` (Tasks 1/4, already merged/existing); `ServiceDistributionDonut.vue` (Task 5); `MonthlyCountChart.vue` (Task 6); `ComplianceRing.vue` (existing, unmodified — props `compliance: GlobalCompliance`, `hideTitle?: boolean`); `ClientStatCard.vue` (existing, unmodified — this task only adds the `compact` boolean attribute to existing usages and new ones); i18n keys from Task 3.
- Produces: the view rendered by the router at `admin-dashboard` (unchanged route, already wired).

- [ ] **Step 1: Replace the file**

Replace the full contents of `frontend/src/modules/dashboard/views/AdminDashboardView.vue` with:

```vue
<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { Briefcase, Building2 } from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import ClientStatCard from '@/components/dashboard/client/ClientStatCard.vue'
import ServiceDistributionDonut from '@/components/dashboard/ServiceDistributionDonut.vue'
import MonthlyCountChart from '@/components/dashboard/MonthlyCountChart.vue'
import ComplianceRing from '@/components/dashboard/ComplianceRing.vue'
import { computeAdminDashboardStats, computeMonthlyRegistrations, type ResponsableAccountStatus } from '@/utils/adminDashboardStats'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'
import type { CategoryCardStatus, GlobalCompliance } from '@/types/dashboard'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()

useHead(() => ({ title: t('dashboard.adminGeneralDashboard.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

// Mismos refs que AdminShell.vue ya provee a admin-operacion (ver
// HigieneIndustrialPanel.vue/RoadSafetyAdminPanel.vue) — sin petición
// nueva al backend, este dashboard solo agrega lo que ya se cargó.
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const services = inject<Ref<ServiceOption[]>>('operacionServices', ref<ServiceOption[]>([]))

const stats = computed(() => computeAdminDashboardStats(organizations.value, services.value))
const monthlyRegistrations = computed(() => computeMonthlyRegistrations(organizations.value))

const ACCOUNT_STATUS_SEMAPHORE: Record<ResponsableAccountStatus, CategoryCardStatus> = {
  ACTIVE: 'VERDE',
  PENDING_ACTIVATION: 'AMARILLO',
  SUSPENDED: 'ROJO',
}
const ACCOUNT_STATUS_ORDER: ResponsableAccountStatus[] = ['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED']

const accountStatusCards = computed(() =>
  ACCOUNT_STATUS_ORDER.map((status) => ({
    status,
    label: t(`dashboard.adminGeneralDashboard.accountStatus.${status}`),
    valor: String(stats.value.cuentasPorEstado[status]),
    estado: ACCOUNT_STATUS_SEMAPHORE[status],
  })),
)

// verde/amarillo/rojo = ACTIVE/PENDING_ACTIVATION/SUSPENDED, mismo mapeo de
// accountStatusCards de arriba. `total` es la suma de esos 3 (no
// stats.totalClientes): así el anillo siempre grafica exactamente lo que
// suma, incluso en el caso teórico de una organización sin responsable
// (nunca ocurre hoy — toda alta crea uno en la misma transacción — pero
// así el % del centro del anillo nunca queda inconsistente con sus propios
// arcos).
const accountStatusCompliance = computed<GlobalCompliance>(() => {
  const { ACTIVE, PENDING_ACTIVATION, SUSPENDED } = stats.value.cuentasPorEstado
  const total = ACTIVE + PENDING_ACTIVATION + SUSPENDED
  return {
    pct: total > 0 ? Math.round((ACTIVE / total) * 100) : 0,
    verde: ACTIVE,
    amarillo: PENDING_ACTIVATION,
    rojo: SUSPENDED,
    total,
  }
})

// Paleta categórica fija para el donut de servicios — mismos tonos 500 que
// iconColorForCategory() usa para las categorías de Higiene Industrial
// (amber/sky/emerald/violet/rose), acá en hex porque Chart.js no acepta
// clases de Tailwind. El sky-500 es el valor de marca de este proyecto
// (#3a6eab, ver style.css @theme), no el sky-500 genérico de Tailwind.
const SERVICE_DONUT_PALETTE = ['#f59e0b', '#3a6eab', '#10b981', '#8b5cf6', '#f43f5e']

const serviceDonutSlices = computed(() =>
  stats.value.clientesPorServicio.map((service, index) => ({
    label: serviceLabel(service.slug, service.nombre, locale.value as Locale),
    value: service.count,
    color: SERVICE_DONUT_PALETTE[index % SERVICE_DONUT_PALETTE.length]!,
  })),
)

// Mismo criterio de badge que ClientsListView.vue:184-188 — duplicado acá
// (3 líneas) en vez de extraído a un util compartido: con un solo
// consumidor más no amerita la indirección.
function statusBadgeClass(accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'): string {
  if (accountStatus === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (accountStatus === 'SUSPENDED') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-line-strong bg-cream text-navy-700/60'
}
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="t('dashboard.adminGeneralDashboard.pageTitle')" />

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.resumenTitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.clientesRegistrados')"
          :valor="String(stats.totalClientes)"
          :icon="Building2"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.serviciosActivos')"
          :valor="String(stats.totalServicios)"
          :icon="Briefcase"
          compact
        />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.clientesPorServicioTitle') }}
      </p>
      <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div class="grid gap-4 sm:grid-cols-2">
          <ClientStatCard
            v-for="service in stats.clientesPorServicio"
            :key="service.slug"
            :titulo="
              t('dashboard.adminGeneralDashboard.clientesDeServicio', {
                service: serviceLabel(service.slug, service.nombre, locale as Locale),
              })
            "
            :valor="String(service.count)"
            :icon="iconForService(service.slug)"
            compact
          />
        </div>
        <ServiceDistributionDonut :slices="serviceDonutSlices" />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.accountStatusTitle') }}
      </p>
      <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div class="grid gap-4 sm:grid-cols-3">
          <ClientStatCard
            v-for="card in accountStatusCards"
            :key="card.status"
            :titulo="card.label"
            :valor="card.valor"
            :estado="card.estado"
            compact
          />
        </div>
        <ComplianceRing :compliance="accountStatusCompliance" hide-title />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.monthlyRegistrationsTitle') }}
      </p>
      <MonthlyCountChart :data="monthlyRegistrations" />
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.organizationsTableTitle') }}
      </p>
      <div class="overflow-x-auto rounded-lg border border-line-strong bg-white">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.adminGeneralDashboard.table.nombre') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.adminGeneralDashboard.table.servicios') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.adminGeneralDashboard.table.estado') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="org in organizations" :key="org.id" class="border-t border-line">
              <td class="px-4 py-3">
                <p class="font-semibold text-navy-900">{{ org.nombre }}</p>
                <p class="text-xs text-navy-700/60">{{ t('organizations.form.nit') }}: {{ org.nit ?? '—' }}</p>
              </td>
              <td class="px-4 py-3 text-navy-700">
                <span v-if="org.services.length === 0">—</span>
                <span v-else>{{
                  org.services.map((s) => serviceLabel(s.slug, s.nombre, locale as Locale)).join(', ')
                }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="org.responsable"
                  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase"
                  :class="statusBadgeClass(org.responsable.accountStatus)"
                >
                  {{ t(`organizations.list.responsableStatus.${org.responsable.accountStatus}`) }}
                </span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output. If `ComplianceRing.vue`'s `hideTitle` prop errors as unrecognized when passed via the `hide-title` kebab-case template attribute, check the component's actual prop name at `frontend/src/components/dashboard/ComplianceRing.vue` (it's `hideTitle?: boolean`, Vue's template compiler accepts either casing for `<script setup>` props — this should just work, but verify).

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/modules/dashboard/views/AdminDashboardView.vue
git commit -m "feat: dashboard admin con tarjetas compactas, donuts, tendencia y tabla"
```

---

### Task 8: Final verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full typecheck, both projects**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx tsc --noEmit`
Expected: no output.

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 2: Full test suite, both projects**

Run: `cd /home/laortiz937/Documentos/sst-platform/backend && npx vitest run`
Expected: all existing tests still pass (no test in this plan touches backend test files, since none existed for `organizations`).

Run: `cd /home/laortiz937/Documentos/sst-platform/frontend && npx vitest run`
Expected: all test files pass, including `adminDashboardStats.test.ts` with 12 tests (6 existing + 6 new from Task 4).

- [ ] **Step 3: Manual verification in the browser preview**

Log in as an admin (documented test credentials: `1000000001` / `SEED_SUPERADMIN_PASSWORD` from `backend/.env`), navigate to the admin dashboard (default landing route after login), and confirm:

1. The two "Resumen" cards render in the smaller `compact` size (less padding, smaller icon/value than before).
2. "Clientes por servicio" shows: compact cards on the left/top (one per catalog service) and a donut chart with a legend listing each service + count, colors matching the fixed 5-color palette.
3. "Estado de cuentas" shows: 3 compact cards (colored green/amber/red) and, alongside, the reused `ComplianceRing` donut showing a percentage in the center and the green/amber/red legend pills below it.
4. "Clientes nuevos por mes" shows a bar chart with 6 month labels (localized, e.g. "mar 2026" … "ago 2026"), with bars only where real data exists — with the 4 seeded test organizations, all created in August 2026, only the last bar should be non-zero (around 4), the other 5 months at 0. This is expected, not a bug (already flagged in the spec).
5. "Listado de empresas" shows a read-only table with one row per organization: name + NIT, contracted services (comma-separated, localized labels), and an account-status badge — no action buttons/links in any row.
6. Resize to a narrow viewport (e.g. 375px) and confirm the table has horizontal scroll (`overflow-x-auto`) instead of breaking layout, and the two-column `lg:grid-cols-[2fr_1fr]` sections (service donut, account-status donut) stack to a single column below the `lg` breakpoint.

- [ ] **Step 4: Report results to the user**

Summarize pass/fail for each of the above 6 checks, plus confirmation of typecheck/test results from Steps 1-2. Do not mark the plan complete if any check fails — fix and re-verify first.
