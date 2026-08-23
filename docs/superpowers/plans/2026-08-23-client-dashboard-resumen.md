# Dashboard de resumen para cliente + reordenar sidebar — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al cliente una pantalla "Dashboard" propia (separada de cada servicio individual) con resumen cruzado de sus servicios contratados + feed de noticias del admin, y reordenar el sidebar cliente para que `GENERAL` quede arriba de `SERVICIOS` (mismo orden que ya usa Admin).

**Architecture:** Todo el trabajo es frontend puro (Vue 3 + TypeScript). Se agrega una nueva ruta/vista `ClientHomeView.vue` (independiente de `ClientDashboardView.vue`, que sigue existiendo sin tocar su contenido interno), un pequeño adaptador que resuelve la métrica de cumplimiento por servicio reutilizando endpoints ya existentes, y se modifica `DashboardSidebar.vue` (compartido por ambas vistas) para agregar el nuevo ítem "Dashboard" y reordenar sus dos bloques.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, vue-router, vue-i18n, Tailwind v4, Vitest.

## Global Constraints

- Ningún cambio de backend, Prisma, ni migraciones — todo se resuelve con endpoints ya existentes (spec, sección "Alcance").
- No se toca el sidebar de Admin (`AdminNavSidebar.vue`) — ya tiene el orden correcto, es la referencia.
- No se toca el contenido interno de Higiene Industrial ni Seguridad Vial — solo cambia desde dónde se accede a ellos.
- El feed de noticias nunca marca notificaciones como leídas automáticamente al mostrarse — solo al hacer clic explícito (botón "marcar leído" o abrir el detalle), igual que el resto de la app.
- Nunca interpolar clases de Tailwind — siempre clases literales completas, mismo criterio que el resto del proyecto.

---

### Task 1: Ruta nueva + claves i18n

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Produces: ruta con `name: 'dashboard-resumen'`, path `/:locale(es|en)/dashboard/resumen` — Task 2 (`ClientHomeView.vue`) se registra ahí. Claves i18n bajo `dashboard.home.*` y una nueva `dashboard.sidebar.dashboardLink` — Task 2 y Task 5 las consumen.

- [ ] **Step 1: Agregar la ruta**

En `frontend/src/router/index.ts`, el bloque actual (líneas 70-75):

```typescript
    {
      path: '/:locale(es|en)/dashboard/:serviceSlug',
      name: 'dashboard-service',
      component: () => import('@/modules/dashboard/views/ClientDashboardView.vue'),
      meta: { requiresAuth: true, permission: (to) => `dashboard.${to.params.serviceSlug}.view` },
    },
```

pasa a (se agrega la nueva ruta ANTES de la paramétrica — el orden importa: si `dashboard-resumen` fuera declarada después de `/:serviceSlug`, Vue Router intentaría hacer coincidir `resumen` como si fuera un `serviceSlug` y nunca llegaría a la ruta nueva):

```typescript
    {
      path: '/:locale(es|en)/dashboard/resumen',
      name: 'dashboard-resumen',
      component: () => import('@/modules/dashboard/views/ClientHomeView.vue'),
      meta: { requiresAuth: true },
    },
    // Ruta paramétrica: sirve cualquier servicio contratado, no solo Higiene
    // Industrial — sigue funcionando para bookmarks/links viejos a
    // /dashboard/higiene-industrial porque ese slug encaja igual acá.
    {
      path: '/:locale(es|en)/dashboard/:serviceSlug',
      name: 'dashboard-service',
      component: () => import('@/modules/dashboard/views/ClientDashboardView.vue'),
      meta: { requiresAuth: true, permission: (to) => `dashboard.${to.params.serviceSlug}.view` },
    },
```

(el comentario que ya estaba arriba de la ruta paramétrica se conserva tal cual, solo se le antepone la ruta nueva).

- [ ] **Step 2: Agregar las claves i18n — es.json**

En `frontend/src/i18n/locales/es.json`, dentro de `dashboard.sidebar`, el bloque actual:

```json
    "servicesLabel": "Servicios",
    "generalLabel": "General",
```

pasa a (se agrega `dashboardLink`, sin tocar las demás claves de ese bloque):

```json
    "servicesLabel": "Servicios",
    "generalLabel": "General",
    "dashboardLink": "Dashboard",
```

En el mismo archivo, dentro del objeto `dashboard` (hermano de `sidebar`, `clientView`, `adminGeneralDashboard`, etc. — insertarlo junto a esos), agregar un nuevo bloque `home`:

```json
    "home": {
      "pageTitle": "Dashboard — RoMa+",
      "loading": "Cargando...",
      "serviciosTitle": "Mis servicios",
      "sinServicios": "No tienes servicios contratados todavía.",
      "sinDato": "Sin dato disponible",
      "verDetalle": "Ver detalle",
      "noticiasTitle": "Noticias",
      "verTodasLink": "Ver todas",
      "sinNoticias": "No hay noticias por ahora."
    },
```

- [ ] **Step 3: Agregar las mismas claves — en.json**

En `frontend/src/i18n/locales/en.json`, dentro de `dashboard.sidebar`:

```json
    "servicesLabel": "Services",
    "generalLabel": "General",
    "dashboardLink": "Dashboard",
```

Y el nuevo bloque `dashboard.home`:

```json
    "home": {
      "pageTitle": "Dashboard — RoMa+",
      "loading": "Loading...",
      "serviciosTitle": "My services",
      "sinServicios": "You don't have any contracted services yet.",
      "sinDato": "No data available",
      "verDetalle": "View details",
      "noticiasTitle": "News",
      "verTodasLink": "View all",
      "sinNoticias": "No news right now."
    },
```

- [ ] **Step 4: Validar JSON y typecheck**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/es.json'))" && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json'))" && echo OK`
Expected: `OK`.

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores (la ruta apunta a un archivo `ClientHomeView.vue` que todavía no existe — vue-tsc no falla por esto porque el `import()` dinámico de una ruta no se resuelve en tiempo de compilación de tipos hasta que el archivo exista; si esto genera error, es la señal de crear un archivo vacío temporal — pero no debería, es el mismo patrón que usan las demás rutas con `component: () => import(...)`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/index.ts frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: agregar ruta dashboard-resumen y claves i18n del nuevo dashboard cliente"
```

---

### Task 2: Componente `ClientHomeView.vue` + adaptador de resumen por servicio

**Files:**
- Create: `frontend/src/utils/clientDashboardSummary.ts`
- Create: `frontend/src/modules/dashboard/views/ClientHomeView.vue`

**Interfaces:**
- Consumes: la ruta `dashboard-resumen` (Task 1), las claves `dashboard.home.*`/`dashboard.sidebar.dashboardLink` (Task 1), `DashboardSidebar.vue` (existente, sin modificar en este task — Task 5 lo modifica después, pero ya funciona igual para este consumo), `getClientDashboard`/`listMyContractedServices` de `@/services/dashboard.service`, `getRoadSafetyHoja1` de `@/services/roadSafety.service`, `listNotifications`/`markNotificationRead` de `@/services/notification.service`, `useNotificationsStore` de `@/stores/notifications`, `NotificationItem.vue`, `SectionTitleBanner.vue`, `iconForService`/`serviceLabel`.
- Produces: `export async function fetchServiceComplianceSummary(slug: string): Promise<number | null>` — no lo consume ningún task posterior de este plan, es de uso interno de este componente, pero queda exportado por si se reutiliza más adelante.

- [ ] **Step 1: Crear el adaptador de resumen por servicio**

Crear `frontend/src/utils/clientDashboardSummary.ts`:

```typescript
import { getClientDashboard } from '@/services/dashboard.service'
import { getRoadSafetyHoja1 } from '@/services/roadSafety.service'

/** Resuelve la métrica de cumplimiento más importante de un servicio
 * contratado, para la tarjeta de resumen de `ClientHomeView.vue` — cada
 * servicio expone su dato por un endpoint distinto (no existe un endpoint
 * agregado genérico), así que este adaptador centraliza el mapeo
 * slug → de dónde sacar el número, en vez de esparcir ese switch dentro del
 * componente. Si el slug no está contemplado (servicio futuro no mapeado
 * todavía), devuelve `null` — la tarjeta se sigue mostrando (ícono +
 * nombre), solo sin el número de cumplimiento, nunca rompe la pantalla. */
export async function fetchServiceComplianceSummary(slug: string): Promise<number | null> {
  if (slug === 'higiene-industrial') {
    const dashboard = await getClientDashboard(slug)
    return dashboard.globalCompliance.pct
  }
  if (slug === 'seguridad-vial') {
    const hoja1 = await getRoadSafetyHoja1({})
    return hoja1.cumplimientoPesvGlobal
  }
  return null
}
```

- [ ] **Step 2: Crear el componente `ClientHomeView.vue`**

Crear `frontend/src/modules/dashboard/views/ClientHomeView.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import NotificationItem from '@/components/dashboard/notifications/NotificationItem.vue'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import { listMyContractedServices } from '@/services/dashboard.service'
import { listNotifications, markNotificationRead } from '@/services/notification.service'
import { useNotificationsStore } from '@/stores/notifications'
import { fetchServiceComplianceSummary } from '@/utils/clientDashboardSummary'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { ServiceOption } from '@/types/organization'
import type { AppNotification } from '@/types/notification'
import type { Locale } from '@/i18n'
import type { TabDef } from '@/types/dashboardTabs'

const { t, locale } = useI18n()
const router = useRouter()
const notificationsStore = useNotificationsStore()

useHead(() => ({ title: t('dashboard.home.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const status = ref<'loading' | 'ready'>('loading')
const services = ref<ServiceOption[]>([])
const serviceSummaries = ref<Record<string, number | null>>({})
const noticias = ref<AppNotification[]>([])

async function load() {
  status.value = 'loading'
  const [contractedServices, noticiasResult] = await Promise.all([
    listMyContractedServices(),
    listNotifications({ type: 'MENSAJE_ADMIN', pageSize: 5 }),
  ])
  services.value = contractedServices
  noticias.value = noticiasResult.items

  const summaries = await Promise.all(
    contractedServices.map(
      async (service) => [service.slug, await fetchServiceComplianceSummary(service.slug)] as const,
    ),
  )
  serviceSummaries.value = Object.fromEntries(summaries)
  status.value = 'ready'
}

onMounted(load)

async function handleMarkRead(id: string) {
  const noticia = noticias.value.find((n) => n.id === id)
  if (!noticia || noticia.isRead) return
  noticia.isRead = true
  noticia.readAt = new Date().toISOString()
  notificationsStore.decrementUnread()
  try {
    await markNotificationRead(id)
  } catch {
    // Silencioso a propósito, mismo criterio que NotificationsPanel.vue:
    // el estado ya se actualizó de forma optimista en pantalla, un error de
    // red al confirmar no amerita interrumpir al usuario con un toast.
  }
}

// DashboardSidebar.vue es el mismo componente que usa cada servicio
// individual — acá no hay "servicio seleccionado" ni pestañas propias de
// esta pantalla (sus únicas hojas/tabs son las de cada servicio, a las que
// se navega aparte), así que se le pasa un arreglo vacío de tabs y un slug
// vacío. El único ítem que puede quedar activo es "Dashboard" (GENERAL,
// value inicial 'dashboard'), nunca uno de SERVICIOS.
const emptyTabs: TabDef[] = []
const activeTab = ref('dashboard')

watch(activeTab, (value) => {
  if (value === 'dashboard') return // ya estamos acá, no-op
  if (value === 'notificaciones') {
    router.push({ name: 'dashboard-notificaciones' })
    return
  }
  // 'perfil'/'configuracion' no tienen ruta propia para cliente (a
  // diferencia de notificaciones, que sí la tiene) — se resuelven navegando
  // al primer servicio contratado con ?tab=X, el mismo query param que
  // ClientDashboardView.vue ya interpreta al montar (ver ese archivo).
  if (services.value.length === 0) return // sin servicios contratados no hay a dónde navegar — no debería ocurrir en la práctica, ver dashboardRedirect.ts
  router.push(`/${locale.value}/dashboard/${services.value[0]!.slug}?tab=${value}`)
})

function selectService(slug: string) {
  router.push(`/${locale.value}/dashboard/${slug}`)
}
</script>

<template>
  <DashboardLayout enhanced with-sidebar>
    <DashboardSidebar
      v-model="activeTab"
      :tabs="emptyTabs"
      :services="services"
      selected-service-slug=""
      @update:selected-service-slug="selectService"
    />
    <div>
      <SectionTitleBanner :title="t('dashboard.home.pageTitle')" />
      <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('dashboard.home.loading') }}</p>
      <template v-else>
        <section class="mt-4">
          <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('dashboard.home.serviciosTitle') }}
          </p>
          <div
            v-if="services.length === 0"
            class="rounded-lg border border-dashed border-line-strong bg-white p-6 text-center text-sm text-navy-700/60"
          >
            {{ t('dashboard.home.sinServicios') }}
          </div>
          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="service in services"
              :key="service.slug"
              class="rounded-lg border border-line-strong bg-white p-4"
            >
              <div class="flex items-center gap-2">
                <component
                  :is="iconForService(service.slug)"
                  class="h-5 w-5 shrink-0 text-sky-400"
                  aria-hidden="true"
                />
                <p class="text-sm font-semibold text-navy-900">
                  {{ serviceLabel(service.slug, service.nombre, locale as Locale) }}
                </p>
              </div>
              <p
                v-if="serviceSummaries[service.slug] != null"
                class="mt-2 font-mono text-2xl font-bold text-navy-900"
              >
                {{ serviceSummaries[service.slug] }}%
              </p>
              <p v-else class="mt-2 text-xs text-navy-700/50">{{ t('dashboard.home.sinDato') }}</p>
              <button
                type="button"
                class="mt-3 flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                @click="selectService(service.slug)"
              >
                {{ t('dashboard.home.verDetalle') }}
                <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section class="mt-4">
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
              {{ t('dashboard.home.noticiasTitle') }}
            </p>
            <router-link
              :to="{ name: 'dashboard-notificaciones' }"
              class="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              {{ t('dashboard.home.verTodasLink') }}
              <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
            </router-link>
          </div>
          <p
            v-if="noticias.length === 0"
            class="rounded-lg border border-dashed border-line-strong bg-white p-6 text-center text-sm text-navy-700/60"
          >
            {{ t('dashboard.home.sinNoticias') }}
          </p>
          <div v-else class="grid gap-2">
            <NotificationItem
              v-for="noticia in noticias"
              :key="noticia.id"
              :notification="noticia"
              compact
              @mark-read="handleMarkRead"
            />
          </div>
        </section>
      </template>
    </div>
  </DashboardLayout>
</template>
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/clientDashboardSummary.ts frontend/src/modules/dashboard/views/ClientHomeView.vue
git commit -m "feat: componente ClientHomeView (dashboard de resumen para cliente)"
```

---

### Task 3: Redirect por defecto al nuevo Dashboard

**Files:**
- Modify: `frontend/src/utils/dashboardRedirect.ts`

**Interfaces:**
- Consumes: la ruta `dashboard-resumen` (Task 1).

- [ ] **Step 1: Cambiar el destino del redirect de cliente**

En `frontend/src/utils/dashboardRedirect.ts`, el archivo completo actual:

```typescript
import type { useAuthStore } from '@/stores/auth'

/**
 * A qué dashboard mandar a un usuario ya autenticado — misma lógica de
 * permisos que decide el redirect post-login (LoginView.vue) y el guard de
 * rutas "guestOnly" (router/index.ts), centralizada acá para que no se
 * desincronicen si cambian las claves de permiso.
 */
export function getDashboardPath(auth: ReturnType<typeof useAuthStore>, locale: string): string {
  if (auth.hasPermission('platform.variables.upload')) return `/${locale}/dashboard/admin/dashboard`
  // Un cliente puede tener más de un servicio contratado (permisos
  // "dashboard.<slug>.view") — no hay forma de saber cuál es "el" servicio
  // sin asumir uno, así que se toma el primero que aparezca y se deja que
  // DashboardSidebar.vue muestre el selector si hay más de uno.
  const firstServicePermission = auth.permissions.find((p) => p.startsWith('dashboard.') && p.endsWith('.view'))
  if (firstServicePermission) {
    const slug = firstServicePermission.slice('dashboard.'.length, -'.view'.length)
    return `/${locale}/dashboard/${slug}`
  }
  return `/${locale}/`
}
```

pasa a:

```typescript
import type { useAuthStore } from '@/stores/auth'

/**
 * A qué dashboard mandar a un usuario ya autenticado — misma lógica de
 * permisos que decide el redirect post-login (LoginView.vue) y el guard de
 * rutas "guestOnly" (router/index.ts), centralizada acá para que no se
 * desincronicen si cambian las claves de permiso.
 */
export function getDashboardPath(auth: ReturnType<typeof useAuthStore>, locale: string): string {
  if (auth.hasPermission('platform.variables.upload')) return `/${locale}/dashboard/admin/dashboard`
  // Un cliente con al menos un servicio contratado aterriza en su propio
  // "Dashboard" de resumen (ClientHomeView.vue) — igual que Admin siempre
  // aterriza en /dashboard/admin/dashboard, no en un servicio específico.
  // Antes se mandaba directo al primer servicio contratado (sin forma real
  // de saber cuál era "el primero" ni mostrar un resumen cruzado); ahora
  // esa pantalla intermedia sí existe.
  const hasAnyService = auth.permissions.some((p) => p.startsWith('dashboard.') && p.endsWith('.view'))
  if (hasAnyService) return `/${locale}/dashboard/resumen`
  return `/${locale}/`
}
```

- [ ] **Step 2: Typecheck y suite completa**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/dashboardRedirect.ts
git commit -m "feat: redirigir cliente al nuevo dashboard de resumen por defecto"
```

---

### Task 4: `ClientDashboardView.vue` — manejar el ítem "Dashboard" del sidebar

**Files:**
- Modify: `frontend/src/modules/dashboard/views/ClientDashboardView.vue`

**Interfaces:**
- Consumes: la ruta `dashboard-resumen` (Task 1).

**Contexto:** Task 5 (siguiente) agrega un botón "Dashboard" al sidebar compartido (`DashboardSidebar.vue`). Al hacer clic, ese botón emite `update:modelValue` con la clave `'dashboard'` — el mismo mecanismo que ya usan "Notificaciones"/"Mi perfil"/"Configuración" (claves reservadas que cada vista que usa el sidebar interpreta). Este task le enseña a `ClientDashboardView.vue` (que hoy no sabe nada de esa clave) a reaccionar navegando a la nueva pantalla, en vez de intentar renderizar un panel que no existe para esa clave.

- [ ] **Step 1: Agregar el watcher de la clave reservada `'dashboard'`**

En `frontend/src/modules/dashboard/views/ClientDashboardView.vue`, el bloque actual (líneas 91-97):

```typescript
// El sidebar navega (router.push) al elegir otro servicio — sincroniza el
// dashboard con la ruta real en vez de duplicar el estado de selección.
watch(serviceSlug, loadDashboard)

function selectService(slug: string) {
  router.push(`/${locale.value}/dashboard/${slug}`)
}
```

pasa a:

```typescript
// El sidebar navega (router.push) al elegir otro servicio — sincroniza el
// dashboard con la ruta real en vez de duplicar el estado de selección.
watch(serviceSlug, loadDashboard)

// El ítem "Dashboard" del sidebar (GENERAL) es una clave reservada de
// `modelValue`, igual que 'notificaciones'/'perfil'/'configuracion' — pero
// a diferencia de esas tres, no hay un panel local que renderizar para
// ella: es una pantalla aparte (ClientHomeView.vue, ruta
// 'dashboard-resumen'), así que en vez de un `v-if` en el template, se
// navega fuera de esta vista apenas se detecta.
watch(activeTab, (value) => {
  if (value === 'dashboard') router.push(`/${locale.value}/dashboard/resumen`)
})

function selectService(slug: string) {
  router.push(`/${locale.value}/dashboard/${slug}`)
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/modules/dashboard/views/ClientDashboardView.vue
git commit -m "feat: ClientDashboardView navega a dashboard-resumen al hacer clic en Dashboard"
```

---

### Task 5: `DashboardSidebar.vue` — agregar ítem "Dashboard" y reordenar bloques

**Files:**
- Modify: `frontend/src/components/dashboard/DashboardSidebar.vue`

**Interfaces:**
- Consumes: la clave i18n `dashboard.sidebar.dashboardLink` (Task 1) y la clave reservada `'dashboard'` que ya interpretan `ClientHomeView.vue` (Task 2, donde es no-op) y `ClientDashboardView.vue` (Task 4, donde navega).

**Contexto:** este componente lo usan AMBAS vistas cliente (`ClientHomeView.vue` y `ClientDashboardView.vue`) — el cambio de orden y el nuevo botón se ven en las dos automáticamente, sin tocarlas de nuevo.

- [ ] **Step 1: Agregar el ícono nuevo al import**

En `frontend/src/components/dashboard/DashboardSidebar.vue`, la línea de import de íconos (línea 3) actual:

```typescript
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, Settings, User, X } from 'lucide-vue-next'
```

pasa a:

```typescript
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, Home, Settings, User, X } from 'lucide-vue-next'
```

- [ ] **Step 2: Mover el bloque GENERAL antes del bloque SERVICIOS, y agregar el ítem "Dashboard"**

En el `<template>`, el bloque `SERVICIOS` (líneas 143-305 del archivo actual) y el bloque `GENERAL` (líneas 307-379) están hoy en este orden — `SERVICIOS` primero:

```vue
    <!-- Acordeón servicio → pestañas → hoja, igual que AdminNavSidebar.vue: ... -->
    <div v-if="services.length > 0" class="mb-3">
      <p ...>{{ t('dashboard.sidebar.servicesLabel') }}</p>
      <ul class="mt-1 flex flex-col gap-1">
        ... (todo el árbol de servicios/pestañas/hojas, sin cambios)
      </ul>
    </div>

    <!-- General de la cuenta — fuera de cualquier servicio, por eso vive
    separada por una línea en vez de mezclada con las pestañas de arriba. -->
    <div class="mt-3 border-t border-white/15 pt-3">
      <p ...>{{ t('dashboard.sidebar.generalLabel') }}</p>
      <ul class="flex flex-col gap-1">
        <li> ... Notificaciones ... </li>
        <li> ... Mi Perfil ... </li>
        <li> ... Configuración ... </li>
      </ul>
    </div>
```

Se invierte el ORDEN de los dos bloques (`GENERAL` pasa a ir primero), la clase que separaba `GENERAL` con un borde superior (`mt-3 border-t border-white/15 pt-3`, pensada para cuando iba abajo) se quita — ahora es el bloque `SERVICIOS` el que necesita esa separación visual respecto al que quedó arriba —, y se agrega un nuevo `<li>` de "Dashboard" como primer ítem dentro de `GENERAL`, antes de "Notificaciones". El resultado final del bloque:

```vue
    <!-- General de la cuenta — va PRIMERO (mismo orden que
    ADMINISTRACIÓN/OPERACIÓN en AdminNavSidebar.vue: la sección general de
    la cuenta arriba, los servicios/operación abajo). "Dashboard" es el
    primer ítem: pantalla de resumen cruzado de servicios + noticias
    (ClientHomeView.vue), separada de cada servicio individual. -->
    <div class="mb-3">
      <p
        class="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/45"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.sidebar.generalLabel') }}
      </p>
      <ul class="flex flex-col gap-1">
        <li>
          <!-- Clave reservada de `modelValue` ('dashboard') — a diferencia
          de Notificaciones/Mi Perfil/Configuración (paneles locales dentro
          de la misma vista), esta navega a una ruta real aparte
          (ClientHomeView.vue) porque no es un panel más de
          ClientDashboardView.vue — ver el watcher que interpreta esta
          clave en cada vista que usa este sidebar. -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :title="collapsed ? t('dashboard.sidebar.dashboardLink') : undefined"
            :class="[
              modelValue === 'dashboard'
                ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            @click="selectTab('dashboard')"
          >
            <Home class="h-5 w-5 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('dashboard.sidebar.dashboardLink') }}</span>
          </button>
        </li>
        <li>
          <!-- No es un TabDef del dashboard cargado (esos vienen de `tabs`) —
          es una clave reservada de `modelValue` ('notificaciones') que
          ClientDashboardView.vue interpreta para mostrar el panel de
          notificaciones dentro del mismo layout, igual que cualquier otra
          pestaña (antes navegaba a una ruta aparte y sacaba al usuario del
          sidebar/panel). -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :title="collapsed ? t('dashboard.sidebar.notificationsLink') : undefined"
            :class="[
              modelValue === 'notificaciones'
                ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            @click="selectTab('notificaciones')"
          >
            <Bell class="h-5 w-5 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('dashboard.sidebar.notificationsLink') }}</span>
          </button>
        </li>
        <li>
          <!-- Mismo mecanismo que Notificaciones: clave reservada de
          `modelValue` ('perfil'), no un TabDef del dashboard. -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              modelValue === 'perfil'
                ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('myProfile.sidebarLink') : undefined"
            @click="selectTab('perfil')"
          >
            <User class="h-5 w-5 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('myProfile.sidebarLink') }}</span>
          </button>
        </li>
        <li>
          <!-- Mismo mecanismo que Notificaciones/Mi Perfil: clave reservada
          de `modelValue` ('configuracion'), no un TabDef del dashboard. -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              modelValue === 'configuracion'
                ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('settings.sidebarLink') : undefined"
            @click="selectTab('configuracion')"
          >
            <Settings class="h-5 w-5 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('settings.sidebarLink') }}</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Acordeón servicio → pestañas → hoja, igual que AdminNavSidebar.vue:
    las pestañas del servicio activo van ANIDADAS bajo su servicio (no en una
    lista aparte al mismo nivel) — así queda claro que "Dashboard" es hijo de
    "Higiene Industrial", no una segunda selección independiente.

    El indicador de ítem activo usa --org-secondary (fallback sky-400, el
    valor de siempre) — a diferencia de AdminNavSidebar.vue, ESTE sidebar sí
    tiene branding real de una empresa detrás (2026-08, feedback de cliente:
    "no se reflejan los colores que configuré" en el menú), así que el
    fondo se queda neutral (bg-navy-900, decisión ya tomada en
    DashboardLayout.vue) pero el acento sí debe leer el color de marca,
    igual que botones/banners/ModalAccentStrip.vue. -->
    <div v-if="services.length > 0" class="mt-3 border-t border-white/15 pt-3">
      <p
        class="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/45"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.sidebar.servicesLabel') }}
      </p>
      <ul class="mt-1 flex flex-col gap-1">
        <li v-for="service in services" :key="service.slug">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              service.slug === selectedServiceSlug
                ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2' : 'px-3 py-2',
            ]"
            :aria-expanded="service.slug === selectedServiceSlug"
            :title="collapsed ? serviceLabel(service.slug, service.nombre, locale as Locale) : undefined"
            @click="selectService(service.slug)"
          >
            <component :is="iconForService(service.slug)" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate" :class="{ 'lg:hidden': collapsed }">{{
              serviceLabel(service.slug, service.nombre, locale as Locale)
            }}</span>
            <ChevronDown
              v-if="service.slug === selectedServiceSlug"
              class="h-4 w-4 shrink-0"
              :class="{ 'lg:hidden': collapsed }"
              aria-hidden="true"
            />
          </button>

          <!-- Colapsado (`collapsed`, solo escritorio): a diferencia del
          intento anterior con flyout emergente (descartado, tapaba
          contenido y era difícil de operar con el mouse), acá el propio
          sub-acordeón queda visible pero angosto — solo los íconos de cada
          pestaña (Dashboard/Iluminación/Sonido/Estrés Térmico/...), sin
          texto ni indentado, para que el usuario vea de un vistazo en qué
          pestaña está parado (el ícono activo se resalta igual que
          expandido) sin necesitar abrir el sidebar completo. Solo aplica a
          este nivel — Hoja 1/2/3 y las hojas de Seguridad Vial (más abajo)
          no tienen ícono propio, así que ESOS sí se ocultan del todo
          colapsado (ver `lg:hidden` en esos dos <ul> internos). -->
          <ul
            v-if="service.slug === selectedServiceSlug && visibleTopTabs.length > 0"
            class="mt-1 flex flex-col gap-1"
            :class="collapsed ? '' : 'ml-4 border-l border-white/15 pl-2'"
          >
            <li v-for="tab in visibleTopTabs" :key="tab.key">
              <button
                type="button"
                class="flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left text-[13px] font-medium transition-colors"
                :class="[
                  tab.key === modelValue
                    ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                    : 'border-l-[3px] border-transparent text-white/60 hover:bg-white/10',
                  collapsed ? 'justify-center px-1.5 py-2' : 'px-2.5 py-1.5',
                ]"
                :title="collapsed ? tab.label : undefined"
                @click="selectTab(tab.key)"
              >
                <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate" :class="{ 'lg:hidden': collapsed }">{{ tab.label }}</span>
                <ChevronDown
                  v-if="tab.key === 'resumen' && tab.key === modelValue && sheetsConfig?.mode === 'substate'"
                  class="h-3.5 w-3.5 shrink-0"
                  :class="{ 'lg:hidden': collapsed }"
                  aria-hidden="true"
                />
              </button>

              <!-- Hoja 1/2/3: navegación interna de "Dashboard", un nivel más
              adentro — nunca ítems sueltos al mismo nivel que las demás
              pestañas (esa era la mezcla confusa de antes). Específico de
              Higiene Industrial (esas 3 hojas no existen en otros servicios) —
              acá solo se muestra el nodo "Dashboard" sin este submenú para no
              listar hojas que no aplican. Sin ícono propio (son "Hoja 1",
              "Hoja 2"...) — colapsado no hay forma legible de mostrarlas, así
              que se ocultan del todo (a diferencia de las pestañas de arriba,
              que sí tienen ícono). -->
              <ul
                v-if="tab.key === 'resumen' && tab.key === modelValue && sheetsConfig?.mode === 'substate'"
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-white/15 pl-2"
                :class="{ 'lg:hidden': collapsed }"
              >
                <li v-for="hoja in sheetsConfig!.sheets" :key="hoja.key">
                  <button
                    type="button"
                    class="flex w-full items-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                    :class="
                      activeHoja === hoja.key
                        ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                        : 'border-l-[3px] border-transparent text-white/60 hover:bg-white/10'
                    "
                    @click="selectHoja(hoja.key as 'hoja1' | 'hoja2' | 'hoja3')"
                  >
                    {{ t(hoja.shortLabelKey) }}
                  </button>
                </li>
              </ul>

              <!-- Seguridad Vial: Hoja1-4 y Alertas SÍ son pestañas reales y
              separadas (no un sub-estado de "Dashboard" como arriba) — cada
              una es su propia página completa (tablas grandes de vehículos/
              conductores/rutas), a diferencia de las hojas livianas de
              Higiene Industrial. Este bloque solo cambia el DIBUJO (las
              indenta bajo "Dashboard", mismo estilo visual que el bloque de
              arriba) — el click sigue navegando con selectTab(), tal como
              las demás pestañas del `v-for` de arriba. A diferencia del
              bloque de Higiene Industrial arriba, NO se condiciona a
              `tab.key === modelValue`: acá sí son pestañas reales, así que
              el submenú debe seguir visible aunque el usuario esté parado en
              Hoja 2/3/4/Alertas (no solo mientras ve "Dashboard") — esa
              condición extra fue el bug reportado: el submenú entero
              desaparecía al hacer clic en cualquier hoja. Colapsado: a
              diferencia de Hoja 1/2/3 de Higiene Industrial (sin ícono
              propio), estas SÍ tienen `hijaTab.icon` — mismo tratamiento
              icon-only que las pestañas de nivel superior, en vez de
              ocultarse del todo. -->
              <ul
                v-if="sheetsConfig?.mode === 'realtabs' && tab.key === sheetsConfig.sheets[0]!.key"
                class="mt-1 flex flex-col gap-1"
                :class="collapsed ? '' : 'ml-4 border-l border-white/15 pl-2'"
              >
                <li v-for="hijaTab in realtabsHojaTabs" :key="hijaTab.key">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left text-[13px] font-medium transition-colors"
                    :class="[
                      hijaTab.key === modelValue
                        ? 'border-l-[3px] border-[var(--org-secondary,#38bdf8)] bg-white/5 text-white font-semibold'
                        : 'border-l-[3px] border-transparent text-white/60 hover:bg-white/10',
                      collapsed ? 'justify-center px-1.5 py-2' : 'px-2.5 py-1.5',
                    ]"
                    :title="collapsed ? hojaShortLabel(hijaTab.key) : undefined"
                    @click="selectTab(hijaTab.key)"
                  >
                    <component :is="hijaTab.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span class="min-w-0 flex-1 truncate" :class="{ 'lg:hidden': collapsed }">{{
                      hojaShortLabel(hijaTab.key)
                    }}</span>
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
```

**Nota para quien implemente este paso:** el bloque de arriba (dentro del nuevo `<div class="mt-3 border-t border-white/15 pt-3">`) es **exactamente el mismo HTML** que hoy vive dentro de `<div v-if="services.length > 0" class="mb-3">` — no cambia ningún botón, `v-if`, `v-for`, evento de click, ni comentario interno del árbol de servicios/pestañas/hojas. Los únicos cambios reales de este paso son: (1) la posición del bloque completo en el template (ahora va después de GENERAL, no antes), y (2) la clase del `<div>` contenedor (pasa de `mb-3` a `mt-3 border-t border-white/15 pt-3`, para que quede la misma separación visual que antes tenía GENERAL).

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 4: Suite completa de tests**

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/DashboardSidebar.vue
git commit -m "feat: agregar item Dashboard y reordenar GENERAL antes de SERVICIOS en sidebar cliente"
```

---

### Task 6: Verificación final de regresión

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Typecheck completo**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 2: Suite completa de tests**

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan.

- [ ] **Step 3: Verificación manual en el navegador**

Con backend y frontend corriendo localmente, iniciar sesión como cliente con al menos 2 servicios contratados (Higiene Industrial + Seguridad Vial):

1. **Redirect post-login**: al iniciar sesión, el cliente aterriza en `/dashboard/resumen` (no en el primer servicio directamente).
2. **Tarjetas de servicio**: se ven tarjetas para cada servicio contratado, cada una con su % de cumplimiento correcto (comparar contra el % que se ve al entrar directamente a cada servicio — deben coincidir) y un botón "Ver detalle" que navega correctamente a ese servicio.
3. **Noticias**: si el admin tiene publicadas notificaciones tipo `MENSAJE_ADMIN` dirigidas a este cliente, aparecen las últimas 5; si no tiene ninguna, se ve el mensaje de estado vacío. El botón "marcar leído" de una noticia funciona (confirmar que el contador de la campana de notificaciones baja en 1). El enlace "Ver todas" navega al panel completo de Notificaciones.
4. **Sidebar reordenado**: confirmar que "GENERAL" (con Dashboard/Notificaciones/Mi perfil/Configuración) aparece arriba, y "SERVICIOS" abajo — tanto en esta pantalla nueva como al entrar a cualquier servicio individual.
5. **Ítem "Dashboard" activo**: al estar en `/dashboard/resumen`, el ítem "Dashboard" del sidebar aparece resaltado como activo; al navegar a un servicio y volver a hacer clic en "Dashboard", regresa correctamente a esta pantalla.
6. **Notificaciones/Mi perfil/Configuración desde esta pantalla**: hacer clic en cada uno desde el sidebar de `/dashboard/resumen` navega correctamente (Notificaciones al panel completo; Mi perfil/Configuración al primer servicio contratado con esas pestañas activas).
7. **Regresión — servicio con 1 solo cliente de prueba**: repetir el punto 1-2 con un cliente que solo tenga 1 servicio contratado, confirmar que también aterriza en `/dashboard/resumen` (no directo al servicio) y ve su única tarjeta correctamente.
8. **Regresión — Admin**: confirmar que el sidebar y dashboard de Admin no cambiaron en nada.
9. **Regresión — contenido interno de cada servicio**: confirmar que Higiene Industrial y Seguridad Vial (Hoja 1 a 5, Panel de alertas, Historial, Informes) siguen funcionando exactamente igual que antes.

- [ ] **Step 4: Reportar resultados**

Resumir aprobado/fallado de cada uno de los 9 puntos del Step 3, además de la confirmación de typecheck/tests de los Steps 1-2. No dar el plan por completo si algún punto falla — corregir y volver a verificar antes.
