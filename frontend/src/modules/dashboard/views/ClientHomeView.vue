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
