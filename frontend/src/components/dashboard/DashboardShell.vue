<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData, UploadHistoryEntry, UploadDetail } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { Locale } from '@/i18n'
import DashboardSidebar from './DashboardSidebar.vue'
import ResumenTab from './tabs/ResumenTab.vue'
import CategoryTab from './tabs/CategoryTab.vue'
import ComparativoTab from './tabs/ComparativoTab.vue'
import HistorialTab from './tabs/HistorialTab.vue'
import ReportesTab from './tabs/ReportesTab.vue'
import { buildDashboardTabs } from '@/utils/dashboardTabs'

const props = defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchUploadDetail: (uploadId: string) => Promise<UploadDetail>
  /** Oculta el sidebar interno de pestañas — para cuando este shell se
   * embebe dentro de otro sidebar que ya controla la pestaña activa (ver
   * HigieneIndustrialPanel.vue / AdminNavSidebar.vue, Fase C). Por defecto
   * false: el uso standalone (ClientDashboardView.vue) no cambia. */
  hideSidebar?: boolean
  /** Listado de pestañas ya calculado por el padre — si se omite, se calcula
   * internamente igual que siempre (uso standalone). */
  tabs?: TabDef[]
  /** Habilita el ícono de corrección por celda en CategoryTab — solo el
   * admin lo pasa (HigieneIndustrialPanel.vue). El cliente nunca lo pasa,
   * así que ClientDashboardView.vue no cambia en nada. */
  editableReadings?: boolean
  correctReading?: (readingId: string, valor: number, reason: string) => Promise<void>
}>()

const { t, locale } = useI18n()

const activeTab = defineModel<string>('activeTab', { default: 'resumen' })

const tabs = computed<TabDef[]>(() => props.tabs ?? buildDashboardTabs(props.dashboard, t, locale.value as Locale))
const activeCategory = computed(() => props.dashboard.categories.find((c) => `cat:${c.categoria}` === activeTab.value))
</script>

<template>
  <div class="grid gap-6" :class="hideSidebar ? '' : 'lg:grid-cols-[220px_1fr] lg:items-start'">
    <DashboardSidebar v-if="!hideSidebar" v-model="activeTab" :tabs="tabs" />

    <div>
      <ResumenTab v-if="activeTab === 'resumen'" :dashboard="dashboard" />
      <CategoryTab
        v-else-if="activeCategory"
        :category="activeCategory"
        :trend="dashboard.trend"
        :editable="props.editableReadings ?? false"
        :correct-reading="props.correctReading"
      />
      <ComparativoTab v-else-if="activeTab === 'comparativo'" :categories="dashboard.categories" />
      <HistorialTab
        v-else-if="activeTab === 'historial'"
        :fetch-history="fetchHistory"
        :fetch-upload-detail="fetchUploadDetail"
      />
      <ReportesTab v-else-if="activeTab === 'reportes'" :dashboard="dashboard" />
    </div>
  </div>
</template>
