<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import ClientDashboardHojas from '@/components/dashboard/client/ClientDashboardHojas.vue'
import NotificationsPanel from '@/modules/notifications/components/NotificationsPanel.vue'
import MyProfilePanel from '@/modules/profile/components/MyProfilePanel.vue'
import {
  getClientDashboard,
  getClientUploadHistory,
  getClientUploadDetail,
  listMyContractedServices,
  DashboardRequestError,
} from '@/services/dashboard.service'
import type { DashboardData, DashboardFilters } from '@/types/dashboard'
import type { ServiceOption } from '@/types/organization'
import type { Locale } from '@/i18n'
import { buildDashboardTabs } from '@/utils/dashboardTabs'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// El slug viene de la ruta (/dashboard/:serviceSlug), no de una constante —
// un cliente puede tener más de un servicio contratado, y el sidebar
// necesita saber cuál se está viendo para resaltarlo/permitir cambiarlo.
const serviceSlug = computed(() => route.params.serviceSlug as string)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const dashboard = ref<DashboardData | null>(null)
const services = ref<ServiceOption[]>([])
const activeTab = ref('resumen')
const activeHoja = ref<'hoja1' | 'hoja2' | 'hoja3'>('hoja1')

useHead(() => ({ title: t('dashboard.clientView.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

async function loadDashboard() {
  status.value = 'loading'
  // Cada servicio tiene sus propias pestañas/categorías — al cambiar de
  // servicio no tiene sentido conservar la pestaña activa del anterior.
  activeTab.value = 'resumen'
  try {
    dashboard.value = await getClientDashboard(serviceSlug.value)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof DashboardRequestError ? err.message : t('dashboard.clientView.loadError')
  }
}

onMounted(async () => {
  await Promise.all([
    loadDashboard(),
    listMyContractedServices().then((result) => {
      services.value = result
    }),
  ])
})

// El sidebar navega (router.push) al elegir otro servicio — sincroniza el
// dashboard con la ruta real en vez de duplicar el estado de selección.
watch(serviceSlug, loadDashboard)

function selectService(slug: string) {
  router.push(`/${locale.value}/dashboard/${slug}`)
}

const tabs = computed(() => (dashboard.value ? buildDashboardTabs(dashboard.value, t, locale.value as Locale) : []))

function fetchHistory() {
  return getClientUploadHistory(serviceSlug.value)
}

function fetchUploadDetail(uploadId: string) {
  return getClientUploadDetail(serviceSlug.value, uploadId)
}

function fetchFilteredDashboard(filters: DashboardFilters) {
  return getClientDashboard(serviceSlug.value, filters)
}
</script>

<template>
  <DashboardLayout :last-sync="dashboard?.lastUpdated ?? null">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <div v-else-if="dashboard" class="grid gap-6 lg:grid-cols-[220px_1fr]">
      <DashboardSidebar
        v-model="activeTab"
        :tabs="tabs"
        :services="services"
        :selected-service-slug="serviceSlug"
        @update:selected-service-slug="selectService"
      />
      <div>
        <ClientDashboardHojas
          v-if="activeTab === 'resumen'"
          v-model:active-hoja="activeHoja"
          :dashboard="dashboard"
          :fetch-history="fetchHistory"
          :fetch-filtered-dashboard="fetchFilteredDashboard"
        />
        <NotificationsPanel v-else-if="activeTab === 'notificaciones'" />
        <MyProfilePanel v-else-if="activeTab === 'perfil'" />
        <DashboardShell
          v-else
          :dashboard="dashboard"
          :fetch-history="fetchHistory"
          :fetch-upload-detail="fetchUploadDetail"
          hide-sidebar
          :tabs="tabs"
          v-model:active-tab="activeTab"
        />
      </div>
    </div>
  </DashboardLayout>
</template>
