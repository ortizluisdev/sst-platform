<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutDashboard, Table2, History, FileText } from 'lucide-vue-next'
import type { DashboardData, UploadHistoryEntry, UploadDetail } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { Locale } from '@/i18n'
import DashboardSidebar from './DashboardSidebar.vue'
import ResumenTab from './tabs/ResumenTab.vue'
import CategoryTab from './tabs/CategoryTab.vue'
import ComparativoTab from './tabs/ComparativoTab.vue'
import HistorialTab from './tabs/HistorialTab.vue'
import ReportesTab from './tabs/ReportesTab.vue'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'

const props = defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchUploadDetail: (uploadId: string) => Promise<UploadDetail>
}>()

const { t, locale } = useI18n()

/**
 * Pestañas fijas (Dashboard/Comparativo/Historial/Reportes) más una pestaña
 * por cada categoría única del catálogo de VariableDefinition cargado —
 * nunca hardcodeadas por nombre, así el mismo shell sirve para cualquier
 * servicio (Higiene Industrial hoy, Seguridad Vial mañana con sus propias
 * categorías) sin tocar este componente. La `key` sigue basada en el
 * nombre crudo de la categoría (dato de negocio); solo el `label` visible
 * pasa por la traducción decorativa de categoryLabel().
 */
const tabs = computed<TabDef[]>(() => [
  { key: 'resumen', label: t('dashboard.tabs.dashboard'), icon: LayoutDashboard },
  ...props.dashboard.categories.map((c) => ({
    key: `cat:${c.categoria}`,
    label: categoryLabel(c.categoria, locale.value as Locale),
    icon: iconForCategory(c.categoria),
  })),
  { key: 'comparativo', label: t('dashboard.tabs.comparativoNormativo'), icon: Table2 },
  { key: 'historial', label: t('dashboard.tabs.historial'), icon: History },
  { key: 'reportes', label: t('dashboard.tabs.reportes'), icon: FileText },
])

const activeTab = ref('resumen')
const activeCategory = computed(() => props.dashboard.categories.find((c) => `cat:${c.categoria}` === activeTab.value))
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
    <DashboardSidebar v-model="activeTab" :tabs="tabs" />

    <div>
      <ResumenTab v-if="activeTab === 'resumen'" :dashboard="dashboard" />
      <CategoryTab v-else-if="activeCategory" :category="activeCategory" :trend="dashboard.trend" />
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
