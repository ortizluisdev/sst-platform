<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Languages, Menu, UserCircle } from 'lucide-vue-next'
import logoPng from '@/assets/logo/roma-logo.png'
import logoWebp from '@/assets/logo/roma-logo.webp'
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
   * ve exactamente igual que siempre. Las 4 páginas que usan este layout
   * (AdminShell.vue, ClientDashboardView.vue, NotificationsView.vue,
   * UpdateProfileView.vue) la pasan siempre — hoy no queda ningún uso sin
   * ella. */
  enhanced?: boolean
  /** Separada de `enhanced`: AdminShell.vue (su propio AdminNavSidebar.vue) y
   * ClientDashboardView.vue (DashboardSidebar.vue) son las dos páginas con
   * sidebar fijo — NotificationsView.vue/UpdateProfileView.vue pasan
   * `enhanced` (mismo navbar) pero nunca tuvieron sidebar, así que no deben
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
// en el template. Necesario para calcular el padding-left del main/footer
// "app shell" (ver sidebarOffsetClass): el sidebar es fixed y arranca debajo
// del navbar (que ahora es continuo, de ancho completo — 2026-08), así que
// solo main/footer (no el header) necesitan ese padding — mismo ancho que
// exponen las clases lg:w-64/lg:w-16 de DashboardSidebar.vue.
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
      :class="enhanced ? 'px-4 py-3 sm:px-8 lg:h-20 lg:py-0' : 'px-4 py-3.5 sm:px-6'"
    >
      <div
        class="mx-auto flex h-full items-center justify-between gap-3"
        :class="enhanced ? 'max-w-[1800px]' : 'max-w-[1280px]'"
      >
        <!-- Logo RoMa: antes vivía arriba del sidebar (AdminNavSidebar.vue /
        DashboardSidebar.vue) — ahora vive acá, en el navbar, que pasa a ser
        una franja continua de ancho completo por encima del sidebar (2026-08,
        "navbar continuo hasta el final") en vez de solo empezar donde
        terminaba el sidebar. Mismo tratamiento visual que tenía (isotipo +
        wordmark + tagline), solo cambia dónde vive. -->
        <div class="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            class="rounded-sm p-1.5 text-navy-700 transition-colors hover:bg-sky-100 lg:hidden"
            :aria-label="t('dashboard.layout.openMenu')"
            @click="drawer.toggle()"
          >
            <Menu class="h-5 w-5" />
          </button>

          <div v-if="withSidebar">
            <picture>
              <source :srcset="logoWebp" type="image/webp" />
              <img :src="logoPng" alt="RoMa" class="block h-7 w-auto sm:h-8" width="572" height="166" />
            </picture>
            <p class="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-700 opacity-60 sm:block">
              {{ t('dashboard.sidebar.tagline') }}
            </p>
          </div>
        </div>

        <!-- Orden de derecha a izquierda pedido: notificaciones, identidad de
        la empresa (logo+nombre+NIT, solo cliente), perfil+cerrar sesión,
        idioma al final. -->
        <div class="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
          <NotificationBell v-if="auth.user" />

          <!-- Identidad de la empresa: antes solo el logo (cuadrado, h-14);
          ahora "menos alto, más ancho" + nombre y NIT al lado, para que
          quede claro de qué empresa es el dashboard sin depender solo del
          logo. Sin marco/tarjeta, igual que antes. Solo cliente (el admin no
          pertenece a ninguna organización) y solo si el logo cargó — si
          falla, se oculta todo el bloque en vez de mostrar un espacio roto
          (la marca RoMa ya está a la izquierda, no hace falta un respaldo). -->
          <div
            v-if="auth.user && orgLogoUrl && !logoFailed"
            class="hidden min-w-0 items-center gap-2 border-l border-line pl-3 sm:flex"
          >
            <img
              :src="orgLogoUrl"
              :alt="t('dashboard.layout.clientLogoAlt')"
              class="block h-9 w-auto max-w-[64px] shrink-0 rounded-[5%] object-contain sm:max-w-[96px]"
              @error="logoFailed = true"
            />
            <div class="hidden min-w-0 flex-col leading-tight md:flex">
              <span class="truncate text-sm font-semibold text-navy-900" :title="auth.organizationNombre ?? undefined">
                {{ auth.organizationNombre }}
              </span>
              <span v-if="auth.organizationNit" class="truncate text-xs text-navy-700/60">
                {{ t('dashboard.layout.nitPrefix') }} {{ auth.organizationNit }}
              </span>
            </div>
          </div>

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

          <!-- Cambio de idioma: antes texto plano ("EN"/"ES"); ahora una
          píldora con ícono, mismo tratamiento visual que el resto de
          controles del navbar (hover:bg-sky-100). -->
          <router-link
            :to="switchTo"
            class="flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1.5 text-navy-700 no-underline transition-colors hover:bg-sky-100"
            :aria-label="t('dashboard.layout.switchLanguageLabel')"
            :title="t('nav.switchTo')"
          >
            <Languages class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="text-xs font-semibold tracking-wide">{{ otherLocale.toUpperCase() }}</span>
          </router-link>
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
