<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Menu, UserCircle } from 'lucide-vue-next'
import romaIsotype from '@/assets/logo/roma-isotype.svg'
import { useAuthStore } from '@/stores/auth'
import { provideSidebarDrawer } from '@/composables/useSidebarDrawer'
import { provideSidebarCollapse } from '@/composables/useSidebarCollapse'
import { formatDate } from '@/utils/formatDate'
import NotificationBell from '@/components/dashboard/notifications/NotificationBell.vue'
import type { Locale } from '@/i18n'

const props = defineProps<{
  lastSync?: string | null
  /** Rediseño de navbar/ancho (2026-08, "sidebar/navbar/footer del
   * dashboard cliente") — mismo patrón `enhanced`/`isAdmin` que ya usan
   * SummaryCard.vue/DashboardRiskSections.vue: sin esta prop, el navbar se
   * ve exactamente igual que siempre. AdminShell.vue (panel admin) nunca la
   * pasa, a propósito — su navbar/ancho no debe cambiar en este alcance. */
  enhanced?: boolean
  /** Separada de `enhanced`: ClientDashboardView.vue es la única página que
   * renderiza <DashboardSidebar> dentro del slot (ahora fixed a toda la
   * altura) — NotificationsView.vue/UpdateProfileView.vue pasan `enhanced`
   * (mismo navbar ancho) pero nunca tuvieron sidebar, así que no deben
   * reservarle un padding-left que quedaría vacío. */
  withSidebar?: boolean
}>()

const auth = useAuthStore()
const logoFailed = ref(false)
const orgLogoUrl = computed(() =>
  auth.organizationId ? `${import.meta.env.VITE_API_BASE_URL}/organizations/${auth.organizationId}/logo` : null,
)
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const drawer = provideSidebarDrawer()
// Provisto acá aunque DashboardSidebar.vue viva dentro del <slot /> (lo
// renderiza el componente de página, no este layout) — provide/inject
// funciona a través de slots por jerarquía de componentes, no de posición
// en el template. Necesario para calcular el padding-left del navbar/main/
// footer "app shell" (ver sidebarOffsetClass) cuando el sidebar real,
// ahora fixed a toda la altura, se superpone visualmente sobre esa franja
// izquierda — mismo ancho que exponen las clases lg:w-64/lg:w-16 de
// DashboardSidebar.vue.
const { collapsed: sidebarCollapsed } = provideSidebarCollapse()
// Sin `withSidebar`, nunca se aplica: AdminShell.vue usa su propio
// AdminNavSidebar.vue (en flujo normal, no fixed) y no debe desbalancearse;
// NotificationsView.vue/UpdateProfileView.vue pasan `enhanced` pero nunca
// tuvieron sidebar, un padding-left ahí dejaría un hueco vacío.
// pl-24/pl-72 (no pl-20/pl-64, que es el ancho exacto del sidebar): deja
// ~16-24px de aire entre el borde del sidebar y el contenido, si no queda
// pegado.
const sidebarOffsetClass = computed(() => {
  if (!props.withSidebar) return ''
  return sidebarCollapsed.value ? 'lg:pl-24' : 'lg:pl-72'
})

// El color de marca del cliente (--org-primary) queda reservado para
// botones, pills activos y estados de éxito/error — nunca como fondo del
// navbar, que se ve poco profesional con colores corporativos arbitrarios
// (a veces claros, a veces oscuros, a veces feos). El navbar es siempre
// blanco, sin importar el branding elegido.
const profileMenuOpen = ref(false)
const profileMenuEl = ref<HTMLElement | null>(null)

function toggleProfileMenu() {
  profileMenuOpen.value = !profileMenuOpen.value
}

function handleClickOutsideProfileMenu(event: MouseEvent) {
  if (profileMenuEl.value && !profileMenuEl.value.contains(event.target as Node)) {
    profileMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutsideProfileMenu))
onUnmounted(() => document.removeEventListener('click', handleClickOutsideProfileMenu))

async function handleLogout() {
  profileMenuOpen.value = false
  await auth.logout()
  router.push(`/${locale.value}/ingresar`)
}

const lastSyncLabel = computed(() =>
  props.lastSync ? formatDate(props.lastSync, locale.value as Locale) : t('dashboard.layout.noDataYet'),
)

const otherLocale = computed<Locale>(() => (locale.value === 'es' ? 'en' : 'es'))
const switchTo = computed(() => ({
  path: route.path.replace(/^\/(es|en)(\/|$)/, `/${otherLocale.value}$2`),
  query: route.query,
}))
</script>

<template>
  <div
    class="flex flex-col bg-cream"
    :class="enhanced ? 'h-screen overflow-hidden' : 'min-h-screen'"
    :style="auth.brandingCssVars"
  >
    <header
      class="shrink-0 border-b border-line-strong bg-white shadow-sm print:hidden"
      :class="[enhanced ? 'px-4 py-4 sm:px-8 sm:py-5' : 'px-4 py-3.5 sm:px-6', sidebarOffsetClass]"
    >
      <div class="mx-auto flex items-center justify-between gap-3" :class="enhanced ? 'max-w-[1800px]' : 'max-w-[1280px]'">
        <div class="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            class="rounded-sm p-1.5 text-navy-700 transition-colors hover:bg-sky-100 lg:hidden"
            :aria-label="t('dashboard.layout.openMenu')"
            @click="drawer.toggle()"
          >
            <Menu class="h-5 w-5" />
          </button>
        </div>

        <div class="flex shrink-0 items-center" :class="enhanced ? 'gap-3 sm:gap-5' : 'gap-2 sm:gap-4'">
          <NotificationBell v-if="auth.user" />

          <!-- Logo propio del cliente; si no tiene organización (los dos roles
          admin), el isotipo de RoMa ocupa el mismo lugar. Sin marco/tarjeta
          (2026-08, "no me gusta cómo se ve con marco") — antes llevaba borde
          + fondo tenue en el color de marca, se veía pesado; ahora es solo
          la imagen, más grande, con esquinas levemente redondeadas
          (`rounded-[5%]`, no una píldora). -->
          <div v-if="auth.user" class="flex h-14 items-center justify-center">
            <img
              v-if="orgLogoUrl && !logoFailed"
              :src="orgLogoUrl"
              :alt="t('dashboard.layout.clientLogoAlt')"
              class="block h-14 w-auto max-w-[190px] rounded-[5%] object-contain"
              @error="logoFailed = true"
            />
            <img v-else :src="romaIsotype" alt="" class="block h-12 w-12 rounded-[5%]" aria-hidden="true" />
          </div>

          <router-link
            :to="switchTo"
            class="font-semibold tracking-wide text-navy-700 no-underline transition-colors hover:opacity-70"
            :class="enhanced ? 'text-sm' : 'text-[13px]'"
            :aria-label="t('nav.switchTo')"
          >
            {{ otherLocale.toUpperCase() }}
          </router-link>

          <div v-if="auth.user" ref="profileMenuEl" class="relative">
            <button
              type="button"
              class="flex items-center rounded-sm text-navy-700 transition-colors hover:bg-sky-100"
              :class="enhanced ? 'gap-2 p-2' : 'gap-1.5 p-1.5'"
              :aria-label="t('dashboard.layout.profileMenuLabel')"
              :aria-expanded="profileMenuOpen"
              @click="toggleProfileMenu"
            >
              <img
                v-if="auth.user.fotoBase64"
                :src="auth.user.fotoBase64"
                :alt="t('dashboard.layout.profileMenuLabel')"
                class="shrink-0 rounded-full object-cover"
                :class="enhanced ? 'h-7 w-7' : 'h-6 w-6'"
              />
              <UserCircle v-else class="shrink-0" :class="enhanced ? 'h-7 w-7' : 'h-6 w-6'" aria-hidden="true" />
              <span class="hidden min-[400px]:inline" :class="enhanced ? 'text-sm font-medium' : 'text-sm'">{{
                auth.user.nombre
              }}</span>
              <ChevronDown class="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>

            <div
              v-if="profileMenuOpen"
              class="absolute right-0 top-full z-30 mt-2 w-44 rounded-md border border-line-strong bg-white py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-sm text-navy-700 transition-colors hover:bg-sky-100"
                role="menuitem"
                @click="handleLogout"
              >
                {{ t('dashboard.layout.logout') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main
      class="w-full px-4 py-6 sm:px-6 sm:py-8"
      :class="[
        enhanced
          ? withSidebar
            ? 'flex-1 overflow-y-auto'
            : 'mx-auto flex-1 overflow-y-auto max-w-[1800px]'
          : 'mx-auto flex-1 max-w-[1280px]',
        sidebarOffsetClass,
      ]"
    >
      <slot />
    </main>

    <footer
      class="shrink-0 border-t border-line px-4 py-4 print:hidden sm:px-6"
      :class="sidebarOffsetClass"
    >
      <div
        class="mx-auto flex max-w-[1280px] flex-col items-center gap-1 text-center text-xs text-navy-700/60 sm:flex-row sm:justify-between sm:text-left"
      >
        <span>© {{ new Date().getFullYear() }} {{ t('dashboard.layout.copyright') }}</span>
        <span>{{ t('dashboard.layout.lastSync') }}{{ lastSyncLabel }}</span>
      </div>
    </footer>
  </div>
</template>
