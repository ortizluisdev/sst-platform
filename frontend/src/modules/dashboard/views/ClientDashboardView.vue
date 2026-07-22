<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import { getClientDashboard, getClientUploadHistory, getClientUploadDetail, DashboardRequestError } from '@/services/dashboard.service'
import type { DashboardData } from '@/types/dashboard'

const SERVICE_SLUG = 'higiene-industrial'

const { t } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const dashboard = ref<DashboardData | null>(null)

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

function fetchHistory() {
  return getClientUploadHistory(SERVICE_SLUG)
}

function fetchUploadDetail(uploadId: string) {
  return getClientUploadDetail(SERVICE_SLUG, uploadId)
}
</script>

<template>
  <DashboardLayout :last-sync="dashboard?.lastUpdated ?? null">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <DashboardShell
      v-else-if="dashboard"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-upload-detail="fetchUploadDetail"
    />
  </DashboardLayout>
</template>
