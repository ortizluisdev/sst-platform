<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import VariableUploadForm from '@/components/dashboard/VariableUploadForm.vue'
import {
  getAdminDashboard,
  getAdminUploadHistory,
  getAdminUploadDetail,
  DashboardRequestError,
} from '@/services/dashboard.service'
import type { DashboardData } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { Locale } from '@/i18n'
import { buildDashboardTabs } from '@/utils/dashboardTabs'

const SERVICE_SLUG = 'higiene-industrial'

const props = defineProps<{ organizationId: string }>()

const { t, locale } = useI18n()

const lastSync = inject<Ref<string | null> | null>('adminLastSync', null)

// Acordeón del sidebar admin (Fase C): AdminShell posee estas refs porque es
// el ancestro común de AdminNavSidebar y de este panel (varios niveles abajo
// del router-view) — provide/inject no puede subir de este componente a un
// hermano. Este panel las rellena mientras está montado y las limpia al
// desmontarse, para que el acordeón no arrastre sub-vistas de una empresa u
// otro servicio ya no visible.
const sharedActiveTab = inject<Ref<string>>('operacionActiveTab', ref('resumen'))
const sharedServiceTabs = inject<Ref<TabDef[]>>('operacionServiceTabs', ref([]))

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const dashboard = ref<DashboardData | null>(null)

const tabs = computed<TabDef[]>(() =>
  dashboard.value ? buildDashboardTabs(dashboard.value, t, locale.value as Locale) : [],
)

watch(tabs, (value) => {
  sharedServiceTabs.value = value
})

onUnmounted(() => {
  sharedServiceTabs.value = []
})

async function loadDashboard() {
  status.value = 'loading'
  errorMessage.value = ''
  try {
    dashboard.value = await getAdminDashboard(props.organizationId, SERVICE_SLUG)
    if (lastSync) lastSync.value = dashboard.value.lastUpdated
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof DashboardRequestError ? err.message : t('dashboard.clientView.loadError')
  }
}

onMounted(loadDashboard)
watch(() => props.organizationId, loadDashboard)

function fetchHistory() {
  return getAdminUploadHistory(props.organizationId, SERVICE_SLUG)
}

function fetchUploadDetail(uploadId: string) {
  return getAdminUploadDetail(props.organizationId, SERVICE_SLUG, uploadId)
}
</script>

<template>
  <div class="grid gap-6">
    <section class="overflow-hidden rounded-lg border border-line-strong bg-white print:hidden">
      <div class="p-4 sm:p-5">
        <VariableUploadForm
          :organization-id="props.organizationId"
          :service-slug="SERVICE_SLUG"
          @uploaded="loadDashboard"
        />
      </div>
    </section>

    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <DashboardShell
      v-else-if="dashboard"
      :key="props.organizationId"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-upload-detail="fetchUploadDetail"
      hide-sidebar
      :tabs="tabs"
      v-model:active-tab="sharedActiveTab"
    />
  </div>
</template>
