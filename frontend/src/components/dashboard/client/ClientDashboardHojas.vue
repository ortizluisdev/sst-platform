<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData, DashboardFilters, UploadHistoryEntry } from '@/types/dashboard'
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'
import ClientDashboardTab from './ClientDashboardTab.vue'
import ClientDetalleTecnicoTab from './ClientDetalleTecnicoTab.vue'
import ClientAnalisisTab from './ClientAnalisisTab.vue'

defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchFilteredDashboard: (filters: DashboardFilters) => Promise<DashboardData>
}>()

const activeHoja = defineModel<'hoja1' | 'hoja2' | 'hoja3'>('activeHoja', { default: 'hoja1' })

const { t } = useI18n()
const primaryTextClass = useOrgPrimaryTextClass()

// "Hoja" ≠ "pestaña": nav interna de la pestaña "Dashboard" (pills
// horizontales acá, en el contenido), NO ítems del sidebar principal — ver
// .superpowers/sdd/handoff-navbar-sidebar.md, decisión #1.
const HOJAS = [
  { key: 'hoja1', label: 'dashboard.clientTabs.hoja1' },
  { key: 'hoja2', label: 'dashboard.clientTabs.hoja2' },
  { key: 'hoja3', label: 'dashboard.clientTabs.hoja3' },
] as const

// Hoja 1 y Hoja 2 exponen exportCsv/printReport vía defineExpose para que
// sus botones se puedan renderizar acá arriba, junto al selector de hojas,
// en vez de repetir la lógica de exportación en cada hoja.
const hoja1Ref = ref<InstanceType<typeof ClientDashboardTab> | null>(null)
const hoja2Ref = ref<InstanceType<typeof ClientDetalleTecnicoTab> | null>(null)
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div class="inline-flex w-fit gap-1 rounded-lg border border-line-strong bg-white p-1">
        <button
          v-for="hoja in HOJAS"
          :key="hoja.key"
          type="button"
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
          :class="
            activeHoja === hoja.key
              ? ['bg-[var(--org-primary,#0b1a33)]', primaryTextClass.text]
              : 'text-navy-700 hover:bg-cream'
          "
          @click="activeHoja = hoja.key"
        >
          {{ t(hoja.label) }}
        </button>
      </div>

      <div v-if="activeHoja === 'hoja1' || activeHoja === 'hoja2'" class="flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-sm border border-[var(--org-primary,#0b1a33)] bg-[var(--org-primary,#0b1a33)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
          :class="[primaryTextClass.text, 'hover:text-[var(--org-primary,#0b1a33)]']"
          @click="activeHoja === 'hoja1' ? hoja1Ref?.exportCsv() : hoja2Ref?.exportCsv()"
        >
          {{ t('dashboard.clientDashboardTab.exportCsv') }}
        </button>
        <button
          type="button"
          class="rounded-sm border border-[var(--org-primary,#0b1a33)] px-5 py-2.5 text-sm font-medium text-[var(--org-primary,#0b1a33)] transition-colors hover:bg-[var(--org-primary,#0b1a33)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
          :class="primaryTextClass.hoverText"
          @click="activeHoja === 'hoja1' ? hoja1Ref?.printReport() : hoja2Ref?.printReport()"
        >
          {{ t('dashboard.clientDashboardTab.exportPdf') }}
        </button>
      </div>
    </div>

    <ClientDashboardTab v-if="activeHoja === 'hoja1'" ref="hoja1Ref" :dashboard="dashboard" />
    <ClientDetalleTecnicoTab
      v-else-if="activeHoja === 'hoja2'"
      ref="hoja2Ref"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-filtered-dashboard="fetchFilteredDashboard"
    />
    <ClientAnalisisTab v-else-if="activeHoja === 'hoja3'" :dashboard="dashboard" />
  </div>
</template>
