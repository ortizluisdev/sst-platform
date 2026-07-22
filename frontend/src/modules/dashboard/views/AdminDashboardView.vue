<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { ShieldCheck } from 'lucide-vue-next'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import VariableUploadForm from '@/components/dashboard/VariableUploadForm.vue'
import {
  getAdminDashboard,
  listOrganizations,
  getAdminUploadHistory,
  getAdminUploadDetail,
  DashboardRequestError,
} from '@/services/dashboard.service'
import type { DashboardData, OrganizationOption } from '@/types/dashboard'

const SERVICE_SLUG = 'higiene-industrial'

const { t } = useI18n()

const organizations = ref<OrganizationOption[]>([])
const selectedOrgId = ref('')
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const dashboard = ref<DashboardData | null>(null)

useHead(() => ({ title: t('dashboard.adminView.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

async function loadDashboard() {
  if (!selectedOrgId.value) return
  status.value = 'loading'
  errorMessage.value = ''
  try {
    dashboard.value = await getAdminDashboard(selectedOrgId.value, SERVICE_SLUG)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof DashboardRequestError ? err.message : t('dashboard.clientView.loadError')
  }
}

onMounted(async () => {
  try {
    organizations.value = await listOrganizations(SERVICE_SLUG)
    if (organizations.value.length > 0) {
      selectedOrgId.value = organizations.value[0]!.id
    } else {
      status.value = 'error'
      errorMessage.value = t('dashboard.adminView.noOrgs')
    }
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof DashboardRequestError ? err.message : t('dashboard.adminView.loadOrgsError')
  }
})

watch(selectedOrgId, loadDashboard)

function fetchHistory() {
  return getAdminUploadHistory(selectedOrgId.value, SERVICE_SLUG)
}

function fetchUploadDetail(uploadId: string) {
  return getAdminUploadDetail(selectedOrgId.value, SERVICE_SLUG, uploadId)
}
</script>

<template>
  <DashboardLayout :last-sync="dashboard?.lastUpdated ?? null">
    <div class="grid gap-6">
      <section class="overflow-hidden rounded-lg border border-navy-500/30 bg-sky-100/40 print:hidden">
        <div class="flex items-center gap-2 bg-navy-900 px-4 py-2.5 sm:px-5">
          <ShieldCheck class="h-4 w-4 shrink-0 text-sky-200" aria-hidden="true" />
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-100">{{ t('dashboard.adminView.adminZone') }}</p>
        </div>

        <div class="grid gap-4 p-4 sm:gap-5 sm:p-5">
          <div class="flex flex-wrap items-center gap-3">
            <label for="org-select" class="text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('dashboard.adminView.organization') }}
            </label>
            <select
              id="org-select"
              v-model="selectedOrgId"
              class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
            >
              <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.nombre }}</option>
            </select>
          </div>

          <VariableUploadForm
            v-if="selectedOrgId"
            :organization-id="selectedOrgId"
            :service-slug="SERVICE_SLUG"
            @uploaded="loadDashboard"
          />
        </div>
      </section>

      <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
      <p
        v-else-if="status === 'error'"
        class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
      <DashboardShell
        v-else-if="dashboard"
        :key="selectedOrgId"
        :dashboard="dashboard"
        :fetch-history="fetchHistory"
        :fetch-upload-detail="fetchUploadDetail"
      />
    </div>
  </DashboardLayout>
</template>
