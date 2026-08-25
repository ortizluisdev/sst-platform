<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ClipboardCheck, Truck, IdCard, Map, AlertTriangle, History, FileText, Home, Gauge } from 'lucide-vue-next'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import ClientDashboardHojas from '@/components/dashboard/client/ClientDashboardHojas.vue'
import RoadSafetyClientPanel from '@/components/dashboard/roadSafety/RoadSafetyClientPanel.vue'
import NotificationsPanel from '@/modules/notifications/components/NotificationsPanel.vue'
import MyProfilePanel from '@/modules/profile/components/MyProfilePanel.vue'
import GeneralSettingsPanel from '@/modules/settings/components/GeneralSettingsPanel.vue'
import {
  getClientDashboard,
  getClientUploadHistory,
  getClientUploadDetail,
  listMyContractedServices,
  DashboardRequestError,
} from '@/services/dashboard.service'
import type { DashboardData, DashboardFilters } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { ServiceOption } from '@/types/organization'
import type { Locale } from '@/i18n'
import { buildDashboardTabs } from '@/utils/dashboardTabs'
import { useToast } from '@/composables/useToast'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// El slug viene de la ruta (/dashboard/:serviceSlug), no de una constante —
// un cliente puede tener más de un servicio contratado, y el sidebar
// necesita saber cuál se está viendo para resaltarlo/permitir cambiarlo.
const serviceSlug = computed(() => route.params.serviceSlug as string)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const dashboard = ref<DashboardData | null>(null)
const services = ref<ServiceOption[]>([])
const activeTab = ref('resumen')
const activeHoja = ref<'hoja1' | 'hoja2' | 'hoja3'>('hoja1')

useHead(() => ({ title: t('dashboard.clientView.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

async function loadDashboard() {
  // Seguridad Vial no usa el modelo de VariableDefinition/VariableReading
  // (ver RoadSafetyClientPanel.vue, tiene su propio módulo/endpoints) — no
  // tiene sentido pedirle datos al endpoint genérico de dashboard.
  if (serviceSlug.value === 'seguridad-vial') {
    status.value = 'ready'
    dashboard.value = null
    // Aterriza en 'resumen' (la nueva Hoja 1), no en 'dashboard' — mismo
    // criterio que Higiene Industrial, que aterriza en 'resumen' y ese tab
    // ya muestra su primera hoja por defecto (activeHoja = 'hoja1').
    activeTab.value = 'resumen'
    return
  }

  status.value = 'loading'
  // Cada servicio tiene sus propias pestañas/categorías — al cambiar de
  // servicio no tiene sentido conservar la pestaña activa del anterior.
  activeTab.value = 'resumen'
  try {
    dashboard.value = await getClientDashboard(serviceSlug.value)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof DashboardRequestError ? err.message : t('dashboard.clientView.loadError'))
  }
}

onMounted(async () => {
  await Promise.all([
    loadDashboard(),
    listMyContractedServices().then((result) => {
      services.value = result
    }),
  ])
  // Llegar acá con `?tab=notificaciones` (o `perfil`) — ej. desde "Ver
  // todas" del dropdown de la campana — activa esa pestaña reservada del
  // sidebar en vez de la que loadDashboard() acaba de poner por defecto.
  // Solo se revisa una vez al montar: cambiar de servicio después usa el
  // reset normal de loadDashboard(), no este query inicial.
  if (
    route.query.tab === 'notificaciones' ||
    route.query.tab === 'perfil' ||
    route.query.tab === 'configuracion'
  ) {
    activeTab.value = route.query.tab
  }
})

// El sidebar navega (router.push) al elegir otro servicio — sincroniza el
// dashboard con la ruta real en vez de duplicar el estado de selección.
watch(serviceSlug, loadDashboard)

// El ítem "Dashboard" del sidebar (GENERAL) es una clave reservada de
// `modelValue`, igual que 'notificaciones'/'perfil'/'configuracion' — pero
// a diferencia de esas tres, no hay un panel local que renderizar para
// ella: es una pantalla aparte (ClientHomeView.vue, ruta
// 'dashboard-resumen'), así que en vez de un `v-if` en el template, se
// navega fuera de esta vista apenas se detecta.
watch(activeTab, (value) => {
  if (value === 'inicio') router.push(`/${locale.value}/dashboard/resumen`)
})

function selectService(slug: string) {
  router.push(`/${locale.value}/dashboard/${slug}`)
}

const tabs = computed(() => (dashboard.value ? buildDashboardTabs(dashboard.value, t, locale.value as Locale) : []))

// Seguridad Vial no tiene categorías del modelo genérico (ver loadDashboard
// arriba) — sus "pestañas" son "Dashboard" + las 4 hojas + alertas, listadas
// DIRECTAS bajo el servicio (sin acordeón anidado), exactamente igual que
// AdminNavSidebar.vue las muestra del lado admin (RoadSafetyAdminPanel.vue).
// "Dashboard" separa el resumen KPI del detalle de Hoja 1 — antes Hoja 1
// hacía de landing por defecto, mezclando ambos roles.
const roadSafetyTabs = computed<TabDef[]>(() => [
  { key: 'dashboard', label: t('roadSafety.tabs.dashboardShort'), icon: Home },
  { key: 'resumen', label: t('roadSafety.tabs.resumenShort'), icon: Gauge },
  { key: 'hoja1', label: t('roadSafety.tabs.hoja1'), icon: ClipboardCheck },
  { key: 'hoja2', label: t('roadSafety.tabs.hoja2'), icon: Truck },
  { key: 'hoja3', label: t('roadSafety.tabs.hoja3'), icon: IdCard },
  { key: 'hoja4', label: t('roadSafety.tabs.hoja4'), icon: Map },
  { key: 'alertas', label: t('roadSafety.tabs.alertas'), icon: AlertTriangle },
  { key: 'historial', label: t('roadSafety.tabs.historial'), icon: History },
  { key: 'reportes', label: t('roadSafety.tabs.reportes'), icon: FileText },
])

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
  <DashboardLayout :last-sync="dashboard?.lastUpdated ?? null" enhanced with-sidebar>
    <!-- Skeleton en vez de un mensaje de texto: la pantalla se sentía "en
    blanco" hasta que todo el dashboard aparecía de golpe. No intenta
    replicar el sidebar real (varía por servicio) — solo el área de
    contenido, que es lo que más tarda en tener datos reales. -->
    <div v-if="status === 'loading'" class="grid gap-8">
      <div class="h-10 w-64 animate-pulse rounded-lg bg-line-strong" aria-hidden="true" />
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard v-for="i in 6" :key="i" />
      </div>
      <span class="sr-only">{{ t('dashboard.clientView.loading') }}</span>
    </div>
    <template v-else-if="serviceSlug === 'seguridad-vial'">
      <!-- DashboardSidebar es `fixed` a toda la altura (2026-08, "app
      shell") — ya no ocupa una columna de grid, el padding-left que le deja
      espacio vive en DashboardLayout.vue (sidebarOffsetClass). -->
      <DashboardSidebar
        v-model="activeTab"
        v-model:active-hoja="activeHoja"
        :tabs="roadSafetyTabs"
        :services="services"
        :selected-service-slug="serviceSlug"
        @update:selected-service-slug="selectService"
      />
      <div>
        <NotificationsPanel v-if="activeTab === 'notificaciones'" />
        <MyProfilePanel v-else-if="activeTab === 'perfil'" />
        <GeneralSettingsPanel v-else-if="activeTab === 'configuracion'" />
        <RoadSafetyClientPanel
          v-else
          :active-tab="(activeTab as 'dashboard' | 'resumen' | 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' | 'historial' | 'reportes')"
        />
      </div>
    </template>
    <template v-else-if="dashboard">
      <DashboardSidebar
        v-model="activeTab"
        v-model:active-hoja="activeHoja"
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
          @view-all-non-conformities="activeTab = 'no-conformidades'"
        />
        <NotificationsPanel v-else-if="activeTab === 'notificaciones'" />
        <MyProfilePanel v-else-if="activeTab === 'perfil'" />
        <GeneralSettingsPanel v-else-if="activeTab === 'configuracion'" />
        <DashboardShell
          v-else
          v-model:active-tab="activeTab"
          :dashboard="dashboard"
          :fetch-history="fetchHistory"
          :fetch-upload-detail="fetchUploadDetail"
          hide-sidebar
          :tabs="tabs"
        />
      </div>
    </template>
  </DashboardLayout>
</template>
