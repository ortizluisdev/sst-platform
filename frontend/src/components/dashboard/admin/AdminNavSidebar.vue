<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Bell, ChevronRight, ChevronsLeft, ChevronsRight, MessageSquarePlus, Settings, User, Users, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSidebarDrawer } from '@/composables/useSidebarDrawer'
import { useSidebarCollapse } from '@/composables/useSidebarCollapse'
import type { ServiceOption } from '@/types/organization'
import type { TabDef } from '@/types/dashboardTabs'
import { serviceLabel } from '@/utils/serviceLabel'
import { iconForService } from '@/utils/serviceIcon'
import type { Locale } from '@/i18n'

const props = defineProps<{
  services: ServiceOption[]
  selectedServiceSlug: string
  serviceTabs: TabDef[]
}>()

const emit = defineEmits<{
  'update:selectedServiceSlug': [value: string]
}>()

const activeTab = defineModel<string>('activeTab', { default: 'resumen' })

const { t, locale } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const drawer = useSidebarDrawer()
// Mismo composable compartido que DashboardSidebar.vue (cliente) — provisto
// una sola vez en DashboardLayout.vue, así que este sidebar (fijo, 2026-08,
// "mismo comportamiento de colapso que la vista cliente") queda coordinado
// con el padding-left que ese layout ya le reserva a header/main/footer.
const { collapsed, toggle: toggleCollapsed } = useSidebarCollapse()

// Higiene Industrial y Seguridad Vial tienen panel real con sub-vistas hoy
// (7 pestañas de DashboardShell / 5 hojas+alertas de RoadSafetyAdminPanel)
// — los demás servicios son ítems planos que navegan directo a su
// placeholder "panel en construcción".
function isExpandable(slug: string): boolean {
  return slug === 'higiene-industrial' || slug === 'seguridad-vial'
}

// Los demás servicios del catálogo (Mantenimiento Basado en Riesgo, Modelado
// Científico, Riesgo Mecánico y Locativo) no tienen catálogo de variables ni
// panel real detrás todavía — listarlos en el sidebar como si fueran
// navegables sería mostrar algo roto. Se ocultan hasta que tengan contenido
// real, no solo un placeholder "en construcción".
const visibleServices = computed(() => props.services.filter((s) => isExpandable(s.slug)))

// Derivado puro (no un ref propio): expandido si y solo si estamos viendo
// ese servicio en Operación. Atado a la ruta (no a si props.serviceTabs ya
// cargó) para que no compita con el estado de carga normal — serviceTabs
// también está vacío un instante mientras el dashboard recién elegido
// termina de cargar, y colapsar en ese momento sería el mismo bug de nuevo.
// Fuera de Operación (ej. viendo Clientes) siempre da null, así el acordeón
// no queda "abierto" mostrando contenido de otra pantalla.
const expandedSlug = computed(() =>
  route.name === 'admin-operacion' && isExpandable(props.selectedServiceSlug) ? props.selectedServiceSlug : null,
)

function handleServiceClick(service: ServiceOption) {
  emit('update:selectedServiceSlug', service.slug)
  drawer.close()
}

function handleTabClick(tab: TabDef) {
  activeTab.value = tab.key
  drawer.close()
}
</script>

<template>
  <div
    v-if="drawer.isOpen.value"
    class="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
    aria-hidden="true"
    @click="drawer.close()"
  />

  <!-- Fijo (2026-08, "navbar/sidebar/footer fijos igual que la vista
  cliente") — antes era `lg:sticky lg:top-6 lg:w-64` dentro del flex normal
  de AdminShell.vue, ahora `fixed` como DashboardSidebar.vue (cliente), con
  el mismo ancho colapsado/expandido y el mismo drawer móvil fuera de
  pantalla (`-translate-x-full` en mobile, siempre visible en `lg:`).

  `lg:top-20` (no `inset-y-0`, que arrancaría en y=0): el logo RoMa que antes
  vivía en este bloque ahora vive en el navbar (DashboardLayout.vue, "navbar
  continuo de ancho completo por encima del sidebar", 2026-08) — en
  escritorio el sidebar arranca debajo de ese navbar (misma altura, h-20) en
  vez de superponerse. En móvil sigue siendo el drawer de siempre a pantalla
  completa (top-0): ahí el navbar no convive con el sidebar abierto.

  Fondo bg-navy-900 (2026-08, "que se vea igual que el sidebar cliente" —
  antes quedaba en blanco, distinto del cliente) — mismo tono y mismos
  valores de contraste que DashboardSidebar.vue (white/70 inactivo nivel
  superior, white/60 anidado, white/45 encabezados de sección, bg-white/5
  en el ítem activo — no bg-white/25, que se veía como un recuadro muy
  visible al expandir un servicio, el motivo del reporte original) y
  border-sky-400 en vez del fallback de --org-primary para el indicador
  activo: acá nunca hay branding real de una empresa, así que ese fallback
  siempre caía en un navy casi idéntico al del fondo (invisible encima). -->
  <nav
    class="fixed inset-x-0 top-0 bottom-0 left-0 z-50 flex w-72 max-w-[85vw] -translate-x-full flex-col overflow-y-auto border-r border-white/10 bg-navy-900 p-3 transition-transform duration-300 ease-in-out print:hidden lg:max-w-none lg:top-20 lg:translate-x-0"
    :class="collapsed ? 'lg:w-20' : 'lg:w-64'"
    :aria-label="t('dashboard.adminShell.navAriaLabel')"
  >
    <div class="mb-3 flex items-center justify-end gap-2 border-b border-white/15 px-1 pb-3">
      <button
        type="button"
        class="hidden shrink-0 rounded-sm p-1.5 text-white/70 transition-colors hover:bg-white/10 lg:block"
        :aria-label="t(collapsed ? 'dashboard.sidebar.expand' : 'dashboard.sidebar.collapse')"
        @click="toggleCollapsed"
      >
        <ChevronsRight v-if="collapsed" class="h-4 w-4" />
        <ChevronsLeft v-else class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="rounded-sm p-1.5 text-white/70 transition-colors hover:bg-white/10 lg:hidden"
        :aria-label="t('dashboard.sidebar.closeMenu')"
        @click="drawer.close()"
      >
        <X class="h-4.5 w-4.5" />
      </button>
    </div>

    <p
      class="mb-3 inline-flex w-fit items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80"
      :class="{ 'lg:hidden': collapsed }"
    >
      {{ t(auth.roleLabelKey) }}
    </p>

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
              service.slug === props.selectedServiceSlug
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
          <router-link
            :to="`/${locale}/dashboard/admin/clientes`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-clientes'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('dashboard.adminShell.clientesLink') : undefined"
            @click="drawer.close()"
          >
            <Users class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('dashboard.adminShell.clientesLink') }}</span>
          </router-link>
        </li>
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/notificaciones`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-notificaciones'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('dashboard.adminShell.notificacionesLink') : undefined"
            @click="drawer.close()"
          >
            <Bell class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('dashboard.adminShell.notificacionesLink') }}</span>
          </router-link>
        </li>
        <li v-if="auth.hasPermission('platform.notifications.manage')">
          <router-link
            :to="`/${locale}/dashboard/admin/notificaciones/gestion`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-gestion-notificaciones'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('dashboard.adminShell.gestionNotificacionesLink') : undefined"
            @click="drawer.close()"
          >
            <MessageSquarePlus class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('dashboard.adminShell.gestionNotificacionesLink') }}</span>
          </router-link>
        </li>
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/mi-perfil`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md text-left text-sm font-medium transition-colors"
            :class="[
              $route.name === 'admin-mi-perfil'
                ? 'border-l-[3px] border-sky-400 bg-white/5 text-white font-semibold'
                : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10',
              collapsed ? 'justify-center px-1.5 py-2.5' : 'px-3 py-2.5',
            ]"
            :title="collapsed ? t('myProfile.sidebarLink') : undefined"
            @click="drawer.close()"
          >
            <User class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span :class="{ 'lg:hidden': collapsed }">{{ t('myProfile.sidebarLink') }}</span>
          </router-link>
        </li>
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
