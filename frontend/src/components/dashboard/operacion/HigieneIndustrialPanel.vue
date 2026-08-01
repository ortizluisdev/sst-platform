<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import VariableUploadForm from '@/components/dashboard/VariableUploadForm.vue'
import {
  getAdminDashboard,
  getAdminUploadHistory,
  getAdminUploadDetail,
  correctReading as correctReadingApi,
  DashboardRequestError,
} from '@/services/dashboard.service'
import type { DashboardData } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { Locale } from '@/i18n'
import type { OrganizationListItem } from '@/types/organization'
import { buildDashboardTabs } from '@/utils/dashboardTabs'

const SERVICE_SLUG = 'higiene-industrial'

const props = defineProps<{ organizationId: string }>()

const { t, locale } = useI18n()

const lastSync = inject<Ref<string | null> | null>('adminLastSync', null)

// El selector de empresa vive acá (no en el sidebar) — es parte del panel
// operativo, no de la navegación. AdminShell posee la lista y la función
// para cambiarla (mismo patrón de provide/inject que el acordeón).
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const selectOrg = inject<(id: string) => void>('operacionSelectOrg', () => {})

function handleOrgChange(event: Event) {
  selectOrg((event.target as HTMLSelectElement).value)
}

const activeOrgNombre = computed(() => organizations.value.find((org) => org.id === props.organizationId)?.nombre ?? '')

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

async function correctReading(readingId: string, valor: number, reason: string) {
  await correctReadingApi(props.organizationId, SERVICE_SLUG, readingId, valor, reason)
  await loadDashboard()
}
</script>

<template>
  <div class="grid gap-6">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <DashboardShell
      v-else-if="dashboard"
      :key="props.organizationId"
      v-model:active-tab="sharedActiveTab"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-upload-detail="fetchUploadDetail"
      hide-sidebar
      :tabs="tabs"
      editable-readings
      :correct-reading="correctReading"
      :org-label="activeOrgNombre"
      :organization-id="props.organizationId"
    >
      <template v-if="sharedActiveTab === 'resumen'" #after-banner>
        <section class="overflow-hidden rounded-lg border border-line-strong bg-white print:hidden">
          <div class="grid gap-3 p-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start sm:p-4">
            <div>
              <label
                for="operacion-org-select"
                class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700"
              >
                {{ t('dashboard.adminShell.orgSelectorLabel') }}
              </label>
              <select
                id="operacion-org-select"
                :value="props.organizationId"
                class="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
                @change="handleOrgChange"
              >
                <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.nombre }}</option>
              </select>
            </div>

            <div class="border-t border-line-strong pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
              <VariableUploadForm
                :organization-id="props.organizationId"
                :service-slug="SERVICE_SLUG"
                @uploaded="loadDashboard"
              />
            </div>
          </div>
        </section>
      </template>
    </DashboardShell>
  </div>
</template>
