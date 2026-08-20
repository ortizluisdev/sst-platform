# Dashboard general de Administración Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's default landing screen (currently a specific service dashboard) with a new "Dashboard" view showing platform-wide aggregates (registered clients, active services, clients per service, responsible-account status breakdown), and reorder the sidebar so "Administración" comes before "Operación" with this new Dashboard as its first item.

**Architecture:** Pure frontend feature. `AdminShell.vue` already fetches `listOrganizationsFull()` and `listActiveServices()` on mount and provides them via Vue `provide()`/`inject()` as `operacionOrganizations` / `operacionServices` to every child route. The new view injects those same refs and derives all stats through one new pure function (unit-testable in isolation, no component mounting needed). No backend changes, no new API calls, no new Prisma queries.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, vue-router, vue-i18n, Tailwind, Vitest.

## Global Constraints

- No new backend endpoints, no schema changes — reuse `listOrganizationsFull()` / `listActiveServices()` data already provided by `AdminShell.vue`.
- Reuse existing components: `ClientStatCard.vue`, `SectionTitleBanner.vue`, `SEMAPHORE_STYLES`, `iconForService()`, `serviceLabel()`. Do not create new card/UI components.
- `admin-operacion` route stays exactly as-is — only stops being the default landing route.
- Every new user-facing string needs both `frontend/src/i18n/locales/es.json` and `frontend/src/i18n/locales/en.json` entries (same key, both files), or the frontend TS build fails type-checking against the i18n schema.
- "Clientes por servicio" counts only `isActive: true` contracted services (per approved design).
- Account-status breakdown counts organizations by `responsable.accountStatus`; organizations with `responsable: null` are skipped (should not occur in practice — no error handling needed, just skip).

---

### Task 1: Pure aggregation function `computeAdminDashboardStats`

**Files:**
- Create: `frontend/src/utils/adminDashboardStats.ts`
- Test: `frontend/src/utils/adminDashboardStats.test.ts`

**Interfaces:**
- Consumes: `OrganizationListItem` and `ServiceOption` types from `frontend/src/types/organization.ts` (already exist — `OrganizationListItem.services: OrganizationContractedService[]` where `OrganizationContractedService = { slug: string; nombre: string; isActive: boolean }`, and `OrganizationListItem.responsable: OrganizationResponsable | null` where `OrganizationResponsable.accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'`).
- Produces: `computeAdminDashboardStats(organizations, services): AdminDashboardStats`, and exported types `ServiceClientCount`, `ResponsableAccountStatus`, `AdminDashboardStats` — Task 3 (the view) imports all of these by these exact names.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/adminDashboardStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeAdminDashboardStats } from './adminDashboardStats'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'

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
    responsable: {
      id: 'user-1',
      nombre: 'Responsable 1',
      documentType: 'CC',
      documentNumber: '123456',
      email: 'resp@empresa1.com',
      accountStatus: 'ACTIVE',
      suspendReason: null,
    },
    ...overrides,
  }
}

const SERVICES: ServiceOption[] = [
  { slug: 'higiene-industrial', nombre: 'Higiene Industrial' },
  { slug: 'seguridad-vial', nombre: 'Seguridad Vial' },
]

describe('computeAdminDashboardStats', () => {
  it('cuenta el total de organizaciones recibidas', () => {
    const orgs = [makeOrg({ id: 'a' }), makeOrg({ id: 'b' }), makeOrg({ id: 'c' })]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.totalClientes).toBe(3)
  })

  it('cuenta el total de servicios recibidos', () => {
    const stats = computeAdminDashboardStats([], SERVICES)
    expect(stats.totalServicios).toBe(2)
  })

  it('cuenta clientes por servicio, solo contrataciones activas', () => {
    const orgs = [
      makeOrg({
        id: 'a',
        services: [
          { slug: 'higiene-industrial', nombre: 'Higiene Industrial', isActive: true },
          { slug: 'seguridad-vial', nombre: 'Seguridad Vial', isActive: false },
        ],
      }),
      makeOrg({
        id: 'b',
        services: [{ slug: 'higiene-industrial', nombre: 'Higiene Industrial', isActive: true }],
      }),
      makeOrg({ id: 'c', services: [] }),
    ]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.clientesPorServicio).toEqual([
      { slug: 'higiene-industrial', nombre: 'Higiene Industrial', count: 2 },
      { slug: 'seguridad-vial', nombre: 'Seguridad Vial', count: 0 },
    ])
  })

  it('desglosa cuentas por estado del responsable', () => {
    const orgs = [
      makeOrg({ id: 'a', responsable: { ...makeOrg().responsable!, accountStatus: 'ACTIVE' } }),
      makeOrg({ id: 'b', responsable: { ...makeOrg().responsable!, accountStatus: 'PENDING_ACTIVATION' } }),
      makeOrg({ id: 'c', responsable: { ...makeOrg().responsable!, accountStatus: 'SUSPENDED' } }),
      makeOrg({ id: 'd', responsable: { ...makeOrg().responsable!, accountStatus: 'ACTIVE' } }),
    ]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.cuentasPorEstado).toEqual({ ACTIVE: 2, PENDING_ACTIVATION: 1, SUSPENDED: 1 })
  })

  it('organización sin responsable no rompe el conteo y no se cuenta en ningún estado', () => {
    const orgs = [makeOrg({ id: 'a', responsable: null })]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.cuentasPorEstado).toEqual({ ACTIVE: 0, PENDING_ACTIVATION: 0, SUSPENDED: 0 })
    expect(stats.totalClientes).toBe(1)
  })

  it('sin organizaciones ni servicios, todo en cero sin lanzar error', () => {
    const stats = computeAdminDashboardStats([], [])
    expect(stats).toEqual({
      totalClientes: 0,
      totalServicios: 0,
      clientesPorServicio: [],
      cuentasPorEstado: { ACTIVE: 0, PENDING_ACTIVATION: 0, SUSPENDED: 0 },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/adminDashboardStats.test.ts`
Expected: FAIL — `Failed to resolve import "./adminDashboardStats"` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/utils/adminDashboardStats.ts`:

```ts
import type { OrganizationListItem, ServiceOption } from '@/types/organization'

export interface ServiceClientCount {
  slug: string
  nombre: string
  count: number
}

export type ResponsableAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'

export interface AdminDashboardStats {
  totalClientes: number
  totalServicios: number
  clientesPorServicio: ServiceClientCount[]
  cuentasPorEstado: Record<ResponsableAccountStatus, number>
}

/**
 * Agrega el dashboard general del admin (2026-08, "vista general de la
 * información que puede gestionar el administrador") — deliberadamente
 * puro: recibe los mismos datos que AdminShell.vue ya carga vía
 * listOrganizationsFull()/listActiveServices() y provee a sus rutas hijas
 * (operacionOrganizations/operacionServices), sin pedir nada nuevo al
 * backend.
 */
export function computeAdminDashboardStats(
  organizations: OrganizationListItem[],
  services: ServiceOption[],
): AdminDashboardStats {
  const clientesPorServicio: ServiceClientCount[] = services.map((service) => ({
    slug: service.slug,
    nombre: service.nombre,
    count: organizations.filter((org) => org.services.some((s) => s.slug === service.slug && s.isActive)).length,
  }))

  const cuentasPorEstado: Record<ResponsableAccountStatus, number> = {
    PENDING_ACTIVATION: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
  }
  for (const org of organizations) {
    if (org.responsable) cuentasPorEstado[org.responsable.accountStatus]++
  }

  return {
    totalClientes: organizations.length,
    totalServicios: services.length,
    clientesPorServicio,
    cuentasPorEstado,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/adminDashboardStats.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/utils/adminDashboardStats.ts frontend/src/utils/adminDashboardStats.test.ts
git commit -m "feat: agregados puros del dashboard general de Administración"
```

---

### Task 2: i18n keys (es.json + en.json)

**Files:**
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: nothing (pure content).
- Produces: i18n keys `dashboard.adminShell.dashboardLink`, `dashboard.adminGeneralDashboard.pageTitle`, `.resumenTitle`, `.clientesRegistrados`, `.serviciosActivos`, `.clientesPorServicioTitle`, `.clientesDeServicio` (interpolates `{service}`), `.accountStatusTitle`, `.accountStatus.ACTIVE`, `.accountStatus.PENDING_ACTIVATION`, `.accountStatus.SUSPENDED` — Task 3 and Task 5 read these exact keys.

- [ ] **Step 1: Add `dashboardLink` inside the existing `dashboard.adminShell` block**

In `frontend/src/i18n/locales/es.json`, find this exact block (currently starting at line 959):

```json
    "adminShell": {
      "navAriaLabel": "Navegación de administración",
      "operacionSection": "Operación",
```

Replace with:

```json
    "adminShell": {
      "navAriaLabel": "Navegación de administración",
      "dashboardLink": "Dashboard",
      "operacionSection": "Operación",
```

In `frontend/src/i18n/locales/en.json`, find the equivalent `adminShell` block (same key structure, English values) and add `"dashboardLink": "Dashboard",` right after `"navAriaLabel"` in the same position.

- [ ] **Step 2: Add the new `adminGeneralDashboard` block (es.json)**

In `frontend/src/i18n/locales/es.json`, find this exact block (currently ending the `dashboard` top-level object, right after `adminShell` closes):

```json
    "operacion": {
      "placeholder": "Este panel está en construcción — el servicio contratado por esta empresa todavía no tiene un dashboard implementado."
    }
  },
```

Replace with:

```json
    "operacion": {
      "placeholder": "Este panel está en construcción — el servicio contratado por esta empresa todavía no tiene un dashboard implementado."
    },
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

- [ ] **Step 3: Add the same block to en.json (English values)**

In `frontend/src/i18n/locales/en.json`, find the equivalent closing of the `dashboard.operacion` block (same structure as es.json, just after the English `placeholder` string) and apply the same edit shape, with these English values:

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
```

- [ ] **Step 4: Verify both files are still valid JSON**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/es.json', 'utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 5: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: claves i18n del dashboard general de Administración"
```

---

### Task 3: New view `AdminDashboardView.vue`

**Files:**
- Create: `frontend/src/modules/dashboard/views/AdminDashboardView.vue`

**Interfaces:**
- Consumes: `computeAdminDashboardStats`, `AdminDashboardStats` from `@/utils/adminDashboardStats` (Task 1); i18n keys from Task 2; `ClientStatCard.vue` (`titulo: string`, `valor: string`, `icon?: Component`, `estado?: CategoryCardStatus` props — already exists at `frontend/src/components/dashboard/client/ClientStatCard.vue`); `SectionTitleBanner.vue` (`title: string` prop — already exists at `frontend/src/components/dashboard/SectionTitleBanner.vue`); `iconForService(slug): Component` from `@/utils/serviceIcon`; `serviceLabel(slug, nombre, locale): string` from `@/utils/serviceLabel`; `CategoryCardStatus` type from `@/types/dashboard`; `Ref` injected values `operacionOrganizations` (`Ref<OrganizationListItem[]>`) and `operacionServices` (`Ref<ServiceOption[]>`) already provided by `frontend/src/layouts/AdminShell.vue`.
- Produces: default-exported Vue component, consumed by the router in Task 4.

- [ ] **Step 1: Create the view**

Create `frontend/src/modules/dashboard/views/AdminDashboardView.vue`:

```vue
<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { Briefcase, Building2 } from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import ClientStatCard from '@/components/dashboard/client/ClientStatCard.vue'
import { computeAdminDashboardStats, type ResponsableAccountStatus } from '@/utils/adminDashboardStats'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'
import type { CategoryCardStatus } from '@/types/dashboard'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()

useHead(() => ({ title: t('dashboard.adminGeneralDashboard.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

// Mismos refs que AdminShell.vue ya provee a admin-operacion (ver
// HigieneIndustrialPanel.vue/RoadSafetyAdminPanel.vue) — sin petición
// nueva al backend, este dashboard solo agrega lo que ya se cargó.
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const services = inject<Ref<ServiceOption[]>>('operacionServices', ref<ServiceOption[]>([]))

const stats = computed(() => computeAdminDashboardStats(organizations.value, services.value))

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
        />
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.serviciosActivos')"
          :valor="String(stats.totalServicios)"
          :icon="Briefcase"
        />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.clientesPorServicioTitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.accountStatusTitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-3">
        <ClientStatCard
          v-for="card in accountStatusCards"
          :key="card.status"
          :titulo="card.label"
          :valor="card.valor"
          :estado="card.estado"
        />
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: no output (clean). If it errors on missing i18n keys or type mismatches, fix before continuing — do not proceed to Task 4 with a red typecheck.

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/modules/dashboard/views/AdminDashboardView.vue
git commit -m "feat: vista del dashboard general de Administración"
```

---

### Task 4: Router — new route + change default landing route

**Files:**
- Modify: `frontend/src/router/index.ts:88-149`

**Interfaces:**
- Consumes: `AdminDashboardView.vue` from Task 3 (dynamic import).
- Produces: route named `admin-dashboard` at `/:locale(es|en)/dashboard/admin/dashboard`; the empty-path redirect of `/:locale(es|en)/dashboard/admin` now points here instead of `admin-operacion`.

- [ ] **Step 1: Change the default redirect and add the new route**

In `frontend/src/router/index.ts`, find this exact block:

```ts
      children: [
        { path: '', redirect: { name: 'admin-operacion' } },
        {
          path: 'operacion/:orgId?/:serviceSlug?',
          name: 'admin-operacion',
          component: () => import('@/modules/dashboard/views/AdminOperacionView.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
```

Replace with:

```ts
      children: [
        { path: '', redirect: { name: 'admin-dashboard' } },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/modules/dashboard/views/AdminDashboardView.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
        {
          path: 'operacion/:orgId?/:serviceSlug?',
          name: 'admin-operacion',
          component: () => import('@/modules/dashboard/views/AdminOperacionView.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/router/index.ts
git commit -m "feat: dashboard general como pantalla de entrada del admin"
```

---

### Task 5: Sidebar — reorder sections, add Dashboard link

**Files:**
- Modify: `frontend/src/components/dashboard/admin/AdminNavSidebar.vue`

**Interfaces:**
- Consumes: `admin-dashboard` route name from Task 4; `dashboard.adminShell.dashboardLink` i18n key from Task 2; `LayoutDashboard` icon from `lucide-vue-next`.
- Produces: reordered sidebar (no new props/emits — purely template reordering + one new `<li>`).

- [ ] **Step 1: Add `LayoutDashboard` to the lucide-vue-next import**

Find this exact line (line 5):

```ts
import { Bell, ChevronRight, ChevronsLeft, ChevronsRight, MessageSquarePlus, Settings, User, Users, X } from 'lucide-vue-next'
```

Replace with:

```ts
import {
  Bell,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  MessageSquarePlus,
  Settings,
  User,
  Users,
  X,
} from 'lucide-vue-next'
```

- [ ] **Step 2: Reorder the two section blocks and add the Dashboard link**

Find this exact block (the "Operación" section, immediately followed by the "Administración" section — currently lines 136–311, right after the role-label `<p>` and before the closing `</nav>`):

```vue
    <div>
      <p
        class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/45"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.adminShell.operacionSection') }}
      </p>

      <ul class="mt-1 flex flex-col gap-1">
        <li v-if="visibleServices.length === 0" class="px-2 py-1.5 text-xs text-white/70" :class="{ 'lg:hidden': collapsed }">
          {{ t('dashboard.adminShell.noActiveServices') }}
        </li>
        <li
          v-for="service in visibleServices"
          :key="service.slug"
          class="rounded-md transition-colors"
          :class="expandedSlug === service.slug ? 'bg-white/10' : ''"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              expandedSlug === service.slug
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :aria-expanded="isExpandable(service.slug) ? expandedSlug === service.slug : undefined"
            :title="collapsed ? serviceLabel(service.slug, service.nombre, locale as Locale) : undefined"
            @click="handleServiceClick(service)"
          >
            <component :is="iconForService(service.slug)" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate" :class="{ 'lg:hidden': collapsed }">{{
              serviceLabel(service.slug, service.nombre, locale as Locale)
            }}</span>
            <ChevronRight
              v-if="isExpandable(service.slug)"
              class="h-4 w-4 shrink-0 transition-transform duration-200"
              :class="[expandedSlug === service.slug ? 'rotate-90' : '', { 'lg:hidden': collapsed }]"
              aria-hidden="true"
            />
          </button>

          <!-- v-if simple (no un truco de grid-rows ni <Transition>): solo el
          servicio realmente expandido renderiza props.serviceTabs. Se probó
          con grid-template-rows (0fr↔1fr) y con <Transition> y ambos dejaban
          el acordeón en un estado inconsistente (una entrada "atascada" a
          medio animar, mostrando el contenido del otro servicio) — la
          prioridad acá es que nunca se vea información cruzada entre
          servicios, aunque el despliegue sea instantáneo en vez de animado.
          Colapsado: igual que DashboardSidebar.vue (cliente) — las pestañas
          siguen visibles, solo el ícono (sin indentado ni texto), para que
          el usuario pueda seguir seleccionando cada una. -->
          <ul
            v-if="expandedSlug === service.slug && props.serviceTabs.length > 0"
            class="mt-1 flex flex-col gap-1"
            :class="collapsed ? '' : 'ml-4 border-l border-white/15 pl-2'"
          >
            <li v-for="tab in props.serviceTabs" :key="tab.key">
              <button
                type="button"
                class="flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left text-[13px] font-medium transition-colors"
                :class="[
                  tab.key === activeTab
                    ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                    : 'border-l-[3px] border-transparent text-white/60 hover:bg-white/10',
                  collapsed ? 'justify-center px-1.5 py-2' : 'px-2.5 py-1.5',
                ]"
                :title="collapsed ? tab.label : undefined"
                @click="handleTabClick(tab)"
              >
                <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span :class="{ 'lg:hidden': collapsed }">{{ tab.label }}</span>
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="mt-4 border-t border-white/15 pt-3">
      <p
        class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/45"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.adminShell.administracionSection') }}
      </p>

      <ul class="flex flex-col gap-1">
        <li v-if="auth.hasPermission('platform.organizations.manage') || auth.hasPermission('platform.users.approve')">
```

Replace with (Administración first, with the new Dashboard link as its first `<li>`; Operación second, unchanged content, only `mt-4 border-t border-white/15 pt-3` moved to it since it's now the second block):

```vue
    <div>
      <p
        class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/45"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.adminShell.administracionSection') }}
      </p>

      <ul class="mt-1 flex flex-col gap-1">
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/dashboard`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-dashboard'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('dashboard.adminShell.dashboardLink') : undefined"
            @click="drawer.close()"
          >
            <LayoutDashboard class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('dashboard.adminShell.dashboardLink') }}</span>
          </router-link>
        </li>
        <li v-if="auth.hasPermission('platform.organizations.manage') || auth.hasPermission('platform.users.approve')">
```

- [ ] **Step 3: Close the Administración `<ul>`/`<div>` and open the Operación block where the file used to open Administración**

Find this exact block (the end of the — now-second — Operación `<ul>`, followed by the "Administración" `<div>` opening tag that used to come after it, then its remaining `<li>` items ending with `<Settings>` link, then the closing `</nav>`):

```vue
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/configuracion`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-configuracion'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('settings.sidebarLink') : undefined"
            @click="drawer.close()"
          >
            <Settings class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('settings.sidebarLink') }}</span>
          </router-link>
        </li>
      </ul>
    </div>
  </nav>
</template>
```

Replace with (closes Administración's `<ul>`/`<div>`, then opens the Operación block — same content it had before, just moved after Administración and with `mt-4 border-t border-white/15 pt-3` added to its wrapping `<div>` since it's now second):

```vue
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/configuracion`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-configuracion'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('settings.sidebarLink') : undefined"
            @click="drawer.close()"
          >
            <Settings class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('settings.sidebarLink') }}</span>
          </router-link>
        </li>
      </ul>
    </div>

    <div class="mt-4 border-t border-white/15 pt-3">
      <p
        class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/45"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.adminShell.operacionSection') }}
      </p>

      <ul class="mt-1 flex flex-col gap-1">
        <li v-if="visibleServices.length === 0" class="px-2 py-1.5 text-xs text-white/70" :class="{ 'lg:hidden': collapsed }">
          {{ t('dashboard.adminShell.noActiveServices') }}
        </li>
        <li
          v-for="service in visibleServices"
          :key="service.slug"
          class="rounded-md transition-colors"
          :class="expandedSlug === service.slug ? 'bg-white/10' : ''"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              expandedSlug === service.slug
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :aria-expanded="isExpandable(service.slug) ? expandedSlug === service.slug : undefined"
            :title="collapsed ? serviceLabel(service.slug, service.nombre, locale as Locale) : undefined"
            @click="handleServiceClick(service)"
          >
            <component :is="iconForService(service.slug)" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate" :class="{ 'lg:hidden': collapsed }">{{
              serviceLabel(service.slug, service.nombre, locale as Locale)
            }}</span>
            <ChevronRight
              v-if="isExpandable(service.slug)"
              class="h-4 w-4 shrink-0 transition-transform duration-200"
              :class="[expandedSlug === service.slug ? 'rotate-90' : '', { 'lg:hidden': collapsed }]"
              aria-hidden="true"
            />
          </button>

          <ul
            v-if="expandedSlug === service.slug && props.serviceTabs.length > 0"
            class="mt-1 flex flex-col gap-1"
            :class="collapsed ? '' : 'ml-4 border-l border-white/15 pl-2'"
          >
            <li v-for="tab in props.serviceTabs" :key="tab.key">
              <button
                type="button"
                class="flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left text-[13px] font-medium transition-colors"
                :class="[
                  tab.key === activeTab
                    ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                    : 'border-l-[3px] border-transparent text-white/60 hover:bg-white/10',
                  collapsed ? 'justify-center px-1.5 py-2' : 'px-2.5 py-1.5',
                ]"
                :title="collapsed ? tab.label : undefined"
                @click="handleTabClick(tab)"
              >
                <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span :class="{ 'lg:hidden': collapsed }">{{ tab.label }}</span>
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
</template>
```

> Note for the implementer: after Step 2 and Step 3 above, the file's overall shape is: role-label `<p>` → Administración `<div>` (Dashboard link + Clientes + Notificaciones + Gestionar notificaciones + Mi perfil + Configuración) → Operación `<div>` (service accordion) → `</nav>`. Read the full resulting file once after both edits to confirm there is exactly one Administración block and exactly one Operación block (no duplication), since Step 2 and Step 3 together perform a full swap of two adjacent blocks.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
cd /home/laortiz937/Documentos/sst-platform
git add frontend/src/components/dashboard/admin/AdminNavSidebar.vue
git commit -m "feat: Administración antes de Operación, con Dashboard como primer ítem"
```

---

### Task 6: Final verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: no output.

- [ ] **Step 2: Full test suite**

Run: `cd frontend && npx vitest run`
Expected: all test files pass, including the new `adminDashboardStats.test.ts` (6 tests).

- [ ] **Step 3: Manual verification in the browser preview**

Start/reuse the local dev server, log in as an admin account (documented test credentials: `1000000001` / see local `.env` for `SEED_SUPERADMIN_PASSWORD`), and confirm:
1. Login lands on `/{locale}/dashboard/admin/dashboard` (the new Dashboard), not on a service dashboard.
2. The Dashboard shows: a "Resumen" section with 2 cards (clientes registrados, servicios activos) with non-zero-looking real numbers; a "Clientes por servicio" section with one card per catalog service; an "Estado de cuentas" section with 3 cards (colored green/amber/red) whose numbers sum to the same total as "Clientes registrados" (unless some organization has `responsable: null`, which should not happen with real seeded data).
3. In the sidebar, "Administración" appears above "Operación", and "Dashboard" is the first link inside Administración, above "Clientes".
4. Clicking "Operación" in the sidebar still navigates to and renders the existing per-service admin dashboard correctly (regression check — this route was not touched, only stopped being the default).
5. Reload the page while on `/{locale}/dashboard/admin/dashboard` — it should stay on the Dashboard (not bounce to Operación), confirming `AdminShell.vue`'s existing auto-navigate-on-mount logic doesn't fight the new default route.

- [ ] **Step 4: Report results to the user**

Summarize pass/fail for each of the above 5 checks. Do not mark the plan complete if any check fails — fix and re-verify first.
