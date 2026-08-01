<script setup lang="ts">
import { Bell, ChevronDown, LayoutGrid, User, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { TabDef } from '@/types/dashboardTabs'
import type { ServiceOption } from '@/types/organization'
import { useSidebarDrawer } from '@/composables/useSidebarDrawer'
import { useAuthStore } from '@/stores/auth'
import { serviceLabel } from '@/utils/serviceLabel'
import type { Locale } from '@/i18n'
import logoPng from '@/assets/logo/roma-logo.png'
import logoWebp from '@/assets/logo/roma-logo.webp'

defineProps<{
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

// "Hoja" ≠ "pestaña", pero SÍ es navegación de la pestaña "Dashboard" —
// vive anidada acá, un nivel más adentro, la misma idea que el acordeón de
// admin (servicio → pestañas) pero un nivel más profundo (pestaña → hoja).
const HOJAS = [
  { key: 'hoja1', label: 'dashboard.clientTabs.hoja1Short' },
  { key: 'hoja2', label: 'dashboard.clientTabs.hoja2Short' },
  { key: 'hoja3', label: 'dashboard.clientTabs.hoja3Short' },
] as const

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
</script>

<template>
  <div
    v-if="drawer.isOpen.value"
    class="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
    aria-hidden="true"
    @click="drawer.close()"
  />

  <nav
    class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] -translate-x-full flex-col overflow-y-auto border-r border-line-strong bg-white p-3 transition-transform duration-300 ease-in-out print:hidden lg:sticky lg:top-6 lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:rounded-lg lg:border"
    :class="{ 'translate-x-0': drawer.isOpen.value }"
    :aria-label="t('dashboard.sidebar.navAriaLabel')"
  >
    <div class="mb-3 flex items-start justify-between gap-2 border-b border-line px-1 pb-3">
      <div>
        <picture>
          <source :srcset="logoWebp" type="image/webp" />
          <img :src="logoPng" alt="RoMa" class="block h-8 w-auto" width="572" height="166" />
        </picture>
        <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-700 opacity-60">
          {{ t('dashboard.sidebar.tagline') }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-sm p-1.5 text-navy-700 transition-colors hover:bg-sky-400/10 lg:hidden"
        :aria-label="t('dashboard.sidebar.closeMenu')"
        @click="drawer.close()"
      >
        <X class="h-4.5 w-4.5" />
      </button>
    </div>

    <p
      v-if="auth.user"
      class="mb-3 inline-flex w-fit items-center rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700"
    >
      {{ t(auth.roleLabelKey) }}
    </p>

    <!-- Acordeón servicio → pestañas → hoja, igual que AdminNavSidebar.vue:
    las pestañas del servicio activo van ANIDADAS bajo su servicio (no en una
    lista aparte al mismo nivel) — así queda claro que "Dashboard" es hijo de
    "Higiene Industrial", no una segunda selección independiente. -->
    <div v-if="services.length > 0" class="mb-3">
      <p class="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-60">
        {{ t('dashboard.sidebar.servicesLabel') }}
      </p>
      <ul class="mt-1 flex flex-col gap-1">
        <li v-for="service in services" :key="service.slug">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
            :class="
              service.slug === selectedServiceSlug
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
            :aria-expanded="service.slug === selectedServiceSlug"
            @click="selectService(service.slug)"
          >
            <LayoutGrid class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{
              serviceLabel(service.slug, service.nombre, locale as Locale)
            }}</span>
            <ChevronDown v-if="service.slug === selectedServiceSlug" class="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>

          <ul
            v-if="service.slug === selectedServiceSlug && tabs.length > 0"
            class="ml-4 mt-1 flex flex-col gap-1 border-l border-line-strong pl-2"
          >
            <li v-for="tab in tabs" :key="tab.key">
              <button
                type="button"
                class="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                :class="
                  tab.key === modelValue
                    ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                    : 'border-l-[3px] border-transparent text-navy-700/80 hover:bg-sky-400/10'
                "
                @click="selectTab(tab.key)"
              >
                <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ tab.label }}</span>
                <ChevronDown
                  v-if="tab.key === 'resumen' && tab.key === modelValue"
                  class="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
              </button>

              <!-- Hoja 1/2/3: navegación interna de "Dashboard", un nivel más
              adentro — nunca ítems sueltos al mismo nivel que las demás
              pestañas (esa era la mezcla confusa de antes). -->
              <ul
                v-if="tab.key === 'resumen' && tab.key === modelValue"
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
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <!-- General de la cuenta — fuera de cualquier servicio, por eso vive
    separada por una línea en vez de mezclada con las pestañas de arriba. -->
    <div class="mt-3 border-t border-line pt-3">
      <p class="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-60">
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
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
            :class="
              modelValue === 'notificaciones'
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
            @click="selectTab('notificaciones')"
          >
            <Bell class="h-5 w-5 shrink-0" aria-hidden="true" />
            {{ t('dashboard.sidebar.notificationsLink') }}
          </button>
        </li>
        <li>
          <!-- Mismo mecanismo que Notificaciones: clave reservada de
          `modelValue` ('perfil'), no un TabDef del dashboard. -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
            :class="
              modelValue === 'perfil'
                ? 'border-l-[3px] border-[var(--org-primary,#0b1a33)] text-navy-900 font-semibold'
                : 'border-l-[3px] border-transparent text-navy-700 hover:bg-sky-400/10'
            "
            @click="selectTab('perfil')"
          >
            <User class="h-5 w-5 shrink-0" aria-hidden="true" />
            {{ t('myProfile.sidebarLink') }}
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>
