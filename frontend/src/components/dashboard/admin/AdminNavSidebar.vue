<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Bell, ChevronDown, ChevronRight, LayoutGrid, User, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import type { ServiceOption } from '@/types/organization'
import type { TabDef } from '@/types/dashboardTabs'
import logoPng from '@/assets/logo/roma-logo.png'
import logoWebp from '@/assets/logo/roma-logo.webp'

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

// Solo Higiene Industrial tiene sub-vistas reales hoy (las 7 pestañas de
// DashboardShell) — los demás servicios son ítems planos que navegan directo
// a su placeholder "panel en construcción".
function isExpandable(slug: string): boolean {
  return slug === 'higiene-industrial'
}

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
}

function handleTabClick(tab: TabDef) {
  activeTab.value = tab.key
}
</script>

<template>
  <nav
    class="flex w-full shrink-0 flex-col rounded-lg border border-line-strong bg-white p-3 print:hidden lg:sticky lg:top-6 lg:w-64"
    :aria-label="t('dashboard.adminShell.navAriaLabel')"
  >
    <div class="mb-3 border-b border-line px-1 pb-3">
      <picture>
        <source :srcset="logoWebp" type="image/webp" />
        <img :src="logoPng" alt="RoMa" class="block h-8 w-auto" width="572" height="166" />
      </picture>
      <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-700 opacity-60">
        {{ t('dashboard.sidebar.tagline') }}
      </p>
    </div>

    <p
      class="mb-3 inline-flex w-fit items-center rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700"
    >
      {{ t(auth.roleLabelKey) }}
    </p>

    <div>
      <p class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-60">
        {{ t('dashboard.adminShell.operacionSection') }}
      </p>

      <ul class="mt-1 flex flex-col gap-1">
        <li v-if="props.services.length === 0" class="px-2 py-1.5 text-xs text-navy-700/50">
          {{ t('dashboard.adminShell.noActiveServices') }}
        </li>
        <li v-for="service in props.services" :key="service.slug">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
            :class="
              service.slug === props.selectedServiceSlug
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
            :aria-expanded="isExpandable(service.slug) ? expandedSlug === service.slug : undefined"
            @click="handleServiceClick(service)"
          >
            <LayoutGrid class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ service.nombre }}</span>
            <ChevronDown
              v-if="isExpandable(service.slug) && expandedSlug === service.slug"
              class="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <ChevronRight v-else-if="isExpandable(service.slug)" class="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>

          <ul
            v-if="expandedSlug === service.slug && props.serviceTabs.length > 0"
            class="ml-4 mt-1 flex flex-col gap-1 border-l border-line-strong pl-2"
          >
            <li v-for="tab in props.serviceTabs" :key="tab.key">
              <button
                type="button"
                class="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                :class="
                  tab.key === activeTab
                    ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                    : 'border-l-[3px] border-transparent text-navy-700/80 hover:bg-sky-400/10'
                "
                @click="handleTabClick(tab)"
              >
                <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                {{ tab.label }}
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="mt-4 border-t border-line pt-3">
      <p class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-60">
        {{ t('dashboard.adminShell.administracionSection') }}
      </p>

      <ul class="flex flex-col gap-1">
        <li v-if="auth.hasPermission('platform.organizations.manage') || auth.hasPermission('platform.users.approve')">
          <router-link
            :to="`/${locale}/dashboard/admin/clientes`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
            :class="
              $route.name === 'admin-clientes'
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
          >
            <Users class="h-4 w-4 shrink-0" aria-hidden="true" />
            {{ t('dashboard.adminShell.clientesLink') }}
          </router-link>
        </li>
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/notificaciones`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
            :class="
              $route.name === 'admin-notificaciones'
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
          >
            <Bell class="h-4 w-4 shrink-0" aria-hidden="true" />
            {{ t('dashboard.adminShell.notificacionesLink') }}
          </router-link>
        </li>
        <li>
          <router-link
            :to="`/${locale}/dashboard/admin/mi-perfil`"
            class="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
            :class="
              $route.name === 'admin-mi-perfil'
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
          >
            <User class="h-4 w-4 shrink-0" aria-hidden="true" />
            {{ t('myProfile.sidebarLink') }}
          </router-link>
        </li>
      </ul>
    </div>
  </nav>
</template>
