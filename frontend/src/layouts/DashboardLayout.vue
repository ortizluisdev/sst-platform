<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Menu, UserCircle } from 'lucide-vue-next'
import logoPng from '@/assets/logo/roma-logo.png'
import logoWebp from '@/assets/logo/roma-logo.webp'
import { useAuthStore } from '@/stores/auth'
import { provideSidebarDrawer } from '@/composables/useSidebarDrawer'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'

const props = defineProps<{ lastSync?: string | null }>()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const drawer = provideSidebarDrawer()

async function handleLogout() {
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
  <div class="flex min-h-screen flex-col bg-cream">
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
          <router-link :to="`/${locale}/`" class="shrink-0">
            <picture>
              <source :srcset="logoWebp" type="image/webp" />
              <img :src="logoPng" alt="RoMa — Ciencia Aplicada" class="block h-7 w-auto sm:h-8" width="572" height="166" />
            </picture>
          </router-link>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-4">
          <div v-if="auth.user" class="flex items-center gap-2">
            <UserCircle class="h-5 w-5 shrink-0 text-navy-700" aria-hidden="true" />
            <span class="hidden text-sm text-navy-700 min-[400px]:inline">{{ auth.user.nombre }}</span>
            <span
              class="hidden items-center rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700 min-[480px]:inline-flex"
            >
              {{ t(auth.roleLabelKey) }}
            </span>
          </div>

          <router-link
            :to="switchTo"
            class="text-[13px] font-semibold tracking-wide text-navy-700 no-underline transition-colors hover:text-sky-400"
            :aria-label="t('nav.switchTo')"
          >
            {{ otherLocale.toUpperCase() }}
          </router-link>

          <button
            type="button"
            class="rounded-sm border border-line-strong px-3 py-1.5 text-sm font-medium text-navy-700 transition-colors hover:border-navy-900 hover:text-navy-900 sm:px-3.5"
            @click="handleLogout"
          >
            {{ t('dashboard.layout.logout') }}
          </button>
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
  </div>
</template>
