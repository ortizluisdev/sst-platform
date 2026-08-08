<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Menu, UserCircle } from 'lucide-vue-next'
import romaIsotype from '@/assets/logo/roma-isotype.svg'
import { useAuthStore } from '@/stores/auth'
import { provideSidebarDrawer } from '@/composables/useSidebarDrawer'
import { formatDate } from '@/utils/formatDate'
import NotificationBell from '@/components/dashboard/notifications/NotificationBell.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Locale } from '@/i18n'

const props = defineProps<{ lastSync?: string | null }>()

const auth = useAuthStore()
const logoFailed = ref(false)
const orgLogoUrl = computed(() =>
  auth.organizationId ? `${import.meta.env.VITE_API_BASE_URL}/organizations/${auth.organizationId}/logo` : null,
)
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const drawer = provideSidebarDrawer()

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
  <div class="flex min-h-screen flex-col bg-cream" :style="auth.brandingCssVars">
    <header class="border-b border-line-strong bg-white px-4 py-3.5 shadow-sm print:hidden sm:px-6">
      <div class="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
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

        <div class="flex shrink-0 items-center gap-2 sm:gap-4">
          <NotificationBell v-if="auth.user" />

          <!-- Logo propio del cliente; si no tiene organización (los dos roles
          admin), el isotipo de RoMa ocupa el mismo lugar. Borde + fondo
          tenues en el color de marca del cliente (--org-primary), no gris
          neutro: es su propio elemento del navbar, no un accesorio — y un
          logo en cualquier color (incluido negro puro) sigue siendo visible
          sobre navbar blanco gracias al tinte, sin convertirse en una
          tarjeta pesada. Rectangular con esquinas suaves, ~48px de alto. El
          padding horizontal es apenas el mínimo para que el borde no toque
          la imagen — la imagen ocupa casi todo el alto de la caja (h-10 de
          10 en una caja h-12), no un logo chico flotando en un campo grande. -->
          <div
            v-if="auth.user"
            class="flex h-12 items-center justify-center rounded-lg border border-[var(--org-primary,#0f2a4a)]/25 bg-[var(--org-primary,#0f2a4a)]/5 px-2"
          >
            <img
              v-if="orgLogoUrl && !logoFailed"
              :src="orgLogoUrl"
              :alt="t('dashboard.layout.clientLogoAlt')"
              class="block h-10 w-auto max-w-[160px] object-contain"
              @error="logoFailed = true"
            />
            <img v-else :src="romaIsotype" alt="" class="block h-10 w-10" aria-hidden="true" />
          </div>

          <router-link
            :to="switchTo"
            class="text-[13px] font-semibold tracking-wide text-navy-700 no-underline transition-colors hover:opacity-70"
            :aria-label="t('nav.switchTo')"
          >
            {{ otherLocale.toUpperCase() }}
          </router-link>

          <div v-if="auth.user" ref="profileMenuEl" class="relative">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-sm p-1.5 text-navy-700 transition-colors hover:bg-sky-100"
              :aria-label="t('dashboard.layout.profileMenuLabel')"
              :aria-expanded="profileMenuOpen"
              @click="toggleProfileMenu"
            >
              <img
                v-if="auth.user.fotoBase64"
                :src="auth.user.fotoBase64"
                :alt="t('dashboard.layout.profileMenuLabel')"
                class="h-6 w-6 shrink-0 rounded-full object-cover"
              />
              <UserCircle v-else class="h-6 w-6 shrink-0" aria-hidden="true" />
              <span class="hidden text-sm min-[400px]:inline">{{ auth.user.nombre }}</span>
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

    <main class="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>

    <footer class="border-t border-line px-4 py-4 print:hidden sm:px-6">
      <div
        class="mx-auto flex max-w-[1280px] flex-col items-center gap-1 text-center text-xs text-navy-700/60 sm:flex-row sm:justify-between sm:text-left"
      >
        <span>© {{ new Date().getFullYear() }} {{ t('dashboard.layout.copyright') }}</span>
        <span>{{ t('dashboard.layout.lastSync') }}{{ lastSyncLabel }}</span>
      </div>
    </footer>

    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
