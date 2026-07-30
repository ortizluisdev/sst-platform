<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData, DashboardFilters, UploadHistoryEntry } from '@/types/dashboard'
import ClientDashboardTab from './ClientDashboardTab.vue'
import ClientDetalleTecnicoTab from './ClientDetalleTecnicoTab.vue'
import ClientAnalisisTab from './ClientAnalisisTab.vue'

defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchFilteredDashboard: (filters: DashboardFilters) => Promise<DashboardData>
}>()

const { t } = useI18n()
const activeHoja = ref<'hoja1' | 'hoja2' | 'hoja3'>('hoja1')

const HOJAS = [
  { key: 'hoja1', label: t('dashboard.clientTabs.hoja1') },
  { key: 'hoja2', label: t('dashboard.clientTabs.hoja2') },
  { key: 'hoja3', label: t('dashboard.clientTabs.hoja3') },
] as const
</script>

<template>
  <div class="grid gap-6">
    <div class="inline-flex w-fit gap-1 rounded-lg border border-line-strong bg-white p-1">
      <button
        v-for="hoja in HOJAS"
        :key="hoja.key"
        type="button"
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
        :class="activeHoja === hoja.key ? 'bg-navy-900 text-cream' : 'text-navy-700 hover:bg-cream'"
        @click="activeHoja = hoja.key"
      >
        {{ hoja.label }}
      </button>
    </div>

    <ClientDashboardTab v-if="activeHoja === 'hoja1'" :dashboard="dashboard" />
    <ClientDetalleTecnicoTab
      v-else-if="activeHoja === 'hoja2'"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-filtered-dashboard="fetchFilteredDashboard"
    />
    <ClientAnalisisTab v-else-if="activeHoja === 'hoja3'" :dashboard="dashboard" />
  </div>
</template>
