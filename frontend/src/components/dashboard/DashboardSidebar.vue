<script setup lang="ts">
import { computed } from 'vue'
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, Settings, User, X } from 'lucide-vue-next'
import { iconForService } from '@/utils/serviceIcon'
import { useI18n } from 'vue-i18n'
import type { TabDef } from '@/types/dashboardTabs'
import type { ServiceOption } from '@/types/organization'
import { useSidebarDrawer } from '@/composables/useSidebarDrawer'
import { useSidebarCollapse } from '@/composables/useSidebarCollapse'
import { useAuthStore } from '@/stores/auth'
import { serviceLabel } from '@/utils/serviceLabel'
import type { Locale } from '@/i18n'
import { CLIENT_SHEETS_CONFIG } from '@/config/clientSheets.config'

const props = defineProps<{
  tabs: TabDef[]
  modelValue: string
  services: ServiceOption[]
  selectedServiceSlug: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:selectedServiceSlug': [value: string] }>()

const activeHoja = defineModel<'hoja1' | 'hoja2' | 'hoja3'>('activeHoja', { default: 'hoja1' })

const { t, locale } = useI18n()
const drawer = useSidebarDrawer()
const auth = useAuthStore()

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

function selectTab(key: string) {
  emit('update:modelValue', key)
  drawer.close()
}

function selectService(slug: string) {
  emit('update:selectedServiceSlug', slug)
  drawer.close()
}

function selectHoja(key: 'hoja1' | 'hoja2' | 'hoja3') {
  activeHoja.value = key
  drawer.close()
}

// Angosto a solo íconos — únicamente de escritorio (`lg:`, ver clases del
// <nav>): el drawer móvil (arriba, useSidebarDrawer) es un mecanismo
// totalmente distinto y no se toca. Colapsado, los sub-acordeones (pestañas/
// hojas) se ocultan del todo en vez de mostrarse angostos — un árbol
// anidado a puro ícono queda ilegible; clic en un servicio sigue navegando
// normal, el usuario expande de nuevo para ver sus pestañas.
//
// Compartido vía provide/inject (2026-08, "app shell" fijo) — antes era un
// ref 100% local acá. DashboardLayout.vue (proveedor) necesita el mismo
// valor para calcular el padding-left del navbar/footer fijos, que ahora
// deben dejar el espacio exacto que ocupa este sidebar (también fijo).
const { collapsed, toggle: toggleCollapsed } = useSidebarCollapse()
</script>

<template>
  <div
    v-if="drawer.isOpen.value"
    class="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
    aria-hidden="true"
    @click="drawer.close()"
  />

  <!-- `lg:top-20` (no `inset-y-0`, que arrancaría en y=0): el logo RoMa que
  antes vivía en este bloque ahora vive en el navbar (DashboardLayout.vue,
  "navbar continuo de ancho completo por encima del sidebar", 2026-08) — en
  escritorio el sidebar arranca debajo de ese navbar (misma altura, h-20) en
  vez de superponerse. En móvil sigue siendo el drawer de siempre a pantalla
  completa (top-0): ahí el navbar no convive con el sidebar abierto. -->
  <nav
    class="fixed inset-x-0 top-0 bottom-0 left-0 z-50 flex w-72 max-w-[85vw] -translate-x-full flex-col overflow-y-auto border-r border-white/20 bg-navy-700 p-3 transition-transform duration-300 ease-in-out print:hidden lg:max-w-none lg:top-20 lg:translate-x-0"
    :class="collapsed ? 'lg:w-20' : 'lg:w-64'"
    :aria-label="t('dashboard.sidebar.navAriaLabel')"
  >
    <div class="mb-3 flex items-center justify-end gap-2 border-b border-white/25 px-1 pb-3">
      <button
        type="button"
        class="hidden shrink-0 rounded-sm p-1.5 text-white/90 transition-colors hover:bg-white/20 lg:block"
        :aria-label="t(collapsed ? 'dashboard.sidebar.expand' : 'dashboard.sidebar.collapse')"
        @click="toggleCollapsed"
      >
        <ChevronsRight v-if="collapsed" class="h-4 w-4" />
        <ChevronsLeft v-else class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="rounded-sm p-1.5 text-white/90 transition-colors hover:bg-white/20 lg:hidden"
        :aria-label="t('dashboard.sidebar.closeMenu')"
        @click="drawer.close()"
      >
        <X class="h-4.5 w-4.5" />
      </button>
    </div>

    <p
      v-if="auth.user"
      class="mb-3 inline-flex w-fit items-center rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
      :class="{ 'lg:hidden': collapsed }"
    >
      {{ t(auth.roleLabelKey) }}
    </p>

    <!-- Acordeón servicio → pestañas → hoja, igual que AdminNavSidebar.vue:
    las pestañas del servicio activo van ANIDADAS bajo su servicio (no en una
    lista aparte al mismo nivel) — así queda claro que "Dashboard" es hijo de
    "Higiene Industrial", no una segunda selección independiente. -->
    <div v-if="services.length > 0" class="mb-3">
      <p
        class="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/90"
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
                ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20',
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
            :class="collapsed ? '' : 'ml-4 border-l border-white/25 pl-2'"
          >
            <li v-for="tab in visibleTopTabs" :key="tab.key">
              <button
                type="button"
                class="flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left text-[13px] font-medium transition-colors"
                :class="[
                  tab.key === modelValue
                    ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                    : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20',
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
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-white/25 pl-2"
                :class="{ 'lg:hidden': collapsed }"
              >
                <li v-for="hoja in sheetsConfig!.sheets" :key="hoja.key">
                  <button
                    type="button"
                    class="flex w-full items-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                    :class="
                      activeHoja === hoja.key
                        ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                        : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20'
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
                :class="collapsed ? '' : 'ml-4 border-l border-white/25 pl-2'"
              >
                <li v-for="hijaTab in realtabsHojaTabs" :key="hijaTab.key">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left text-[13px] font-medium transition-colors"
                    :class="[
                      hijaTab.key === modelValue
                        ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                        : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20',
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

    <!-- General de la cuenta — fuera de cualquier servicio, por eso vive
    separada por una línea en vez de mezclada con las pestañas de arriba. -->
    <div class="mt-3 border-t border-white/25 pt-3">
      <p
        class="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/90"
        :class="{ 'lg:hidden': collapsed }"
      >
        {{ t('dashboard.sidebar.generalLabel') }}
      </p>
      <ul class="flex flex-col gap-1">
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
                ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20',
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
                ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20',
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
                ? 'border-l-[3px] border-sky-400 bg-white/25 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/90 hover:bg-white/20',
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
  </nav>
</template>
