<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData, DashboardFilters, UploadHistoryEntry } from '@/types/dashboard'
import { CLIENT_SHEETS_CONFIG } from '@/config/clientSheets.config'
import SectionTitleBanner from '../SectionTitleBanner.vue'
import ReportGeneratorModal from '../ReportGeneratorModal.vue'
import ClientDashboardTab from './ClientDashboardTab.vue'
import ClientDetalleTecnicoTab from './ClientDetalleTecnicoTab.vue'
import ClientAnalisisTab from './ClientAnalisisTab.vue'

const props = defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchFilteredDashboard: (filters: DashboardFilters) => Promise<DashboardData>
}>()

const emit = defineEmits<{ viewAllNonConformities: [] }>()

const activeHoja = defineModel<'hoja1' | 'hoja2' | 'hoja3'>('activeHoja', { default: 'hoja1' })

const { t } = useI18n()

// El selector de Hoja 1/2/3 vive en el sidebar (DashboardSidebar.vue),
// anidado bajo la pestaña "Dashboard" — acá solo queda el título de la hoja
// activa y el botón para generar el reporte (PDF/CSV reales del backend,
// exactos a la plantilla — ver reports.service.ts). El título sale de
// CLIENT_SHEETS_CONFIG (antes era un mapa duplicado acá y en
// DashboardSidebar.vue — una sola fuente de verdad ahora).
const currentTitle = computed(() => {
  const sheet = CLIENT_SHEETS_CONFIG['higiene-industrial']!.sheets.find((s) => s.key === activeHoja.value)
  return sheet ? t(sheet.labelKey) : ''
})

const showReportModal = ref(false)
</script>

<template>
  <div class="grid min-w-0 gap-6">
    <!-- Botón en línea con el banner (antes: fila propia debajo, dos filas
    para lo que cabe en una) — mismo tratamiento que "Cargar variables" en
    el admin: fondo claro, no el mismo tono que el banner oscuro donde
    vive ahora. -->
    <SectionTitleBanner :title="currentTitle">
      <template v-if="activeHoja === 'hoja1' || activeHoja === 'hoja2'" #actions>
        <button
          type="button"
          class="rounded-sm bg-white px-4 py-1.5 text-xs font-semibold text-navy-900 transition-opacity hover:opacity-90 print:hidden"
          @click="showReportModal = true"
        >
          {{ t('dashboard.clientDashboardTab.generateReport') }}
        </button>
      </template>
    </SectionTitleBanner>

    <ClientDashboardTab
      v-if="activeHoja === 'hoja1'"
      :dashboard="dashboard"
      @view-all-non-conformities="emit('viewAllNonConformities')"
    />
    <ClientDetalleTecnicoTab
      v-else-if="activeHoja === 'hoja2'"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-filtered-dashboard="fetchFilteredDashboard"
    />
    <ClientAnalisisTab v-else-if="activeHoja === 'hoja3'" :dashboard="dashboard" />

    <ReportGeneratorModal
      v-if="showReportModal"
      :service-slug="props.dashboard.service.slug"
      :tipo="activeHoja === 'hoja1' ? 'basico' : 'tecnico'"
      @close="showReportModal = false"
    />
  </div>
</template>
