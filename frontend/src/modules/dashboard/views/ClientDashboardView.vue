<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import ClientDashboardHojas from '@/components/dashboard/client/ClientDashboardHojas.vue'
import { getClientDashboard, getClientUploadHistory, getClientUploadDetail, DashboardRequestError } from '@/services/dashboard.service'
import type { DashboardData, DashboardFilters } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { buildDashboardTabs } from '@/utils/dashboardTabs'

const SERVICE_SLUG = 'higiene-industrial'

const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const dashboard = ref<DashboardData | null>(null)
const activeTab = ref('resumen')

useHead(() => ({ title: t('dashboard.clientView.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

onMounted(async () => {
  try {
    dashboard.value = await getClientDashboard(SERVICE_SLUG)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof DashboardRequestError ? err.message : t('dashboard.clientView.loadError')
  }
})

const tabs = computed(() => (dashboard.value ? buildDashboardTabs(dashboard.value, t, locale.value as Locale) : []))

function fetchHistory() {
  return getClientUploadHistory(SERVICE_SLUG)
}

function fetchUploadDetail(uploadId: string) {
  return getClientUploadDetail(SERVICE_SLUG, uploadId)
}

function fetchFilteredDashboard(filters: DashboardFilters) {
  return getClientDashboard(SERVICE_SLUG, filters)
}
</script>

<template>
  <DashboardLayout :last-sync="dashboard?.lastUpdated ?? null">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <div v-else-if="dashboard" class="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
      <DashboardSidebar v-model="activeTab" :tabs="tabs" />
      <div>
        <ClientDashboardHojas
          v-if="activeTab === 'resumen'"
          :dashboard="dashboard"
          :fetch-history="fetchHistory"
          :fetch-filtered-dashboard="fetchFilteredDashboard"
        />
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
