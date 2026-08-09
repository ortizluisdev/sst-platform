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
import NoConformidadesTab from './tabs/NoConformidadesTab.vue'
import HistorialTab from './tabs/HistorialTab.vue'
import ReportesTab from './tabs/ReportesTab.vue'
import { buildDashboardTabs } from '@/utils/dashboardTabs'
import { serviceLabel } from '@/utils/serviceLabel'
import SectionTitleBanner from './SectionTitleBanner.vue'

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
  /** Nombre de la empresa activa — solo el admin lo pasa (HigieneIndustrialPanel.vue,
   * que gestiona varias empresas). Se inserta en el banner para no depender de un
   * segundo banner ("Panel operativo — ...") que quedaba duplicado y desalineaba el
   * layout al cambiar de pestaña. El cliente nunca lo pasa: ya sabe cuál es su empresa. */
  orgLabel?: string
  /** Solo el admin lo pasa (HigieneIndustrialPanel.vue) — ResumenTab.vue lo
   * necesita para cargar/editar el mapa de calor y las no conformidades de
   * la empresa activa (ver DashboardRiskSections.vue). El cliente nunca lo
   * pasa: ClientDashboardView.vue nunca llega a ResumenTab (bypassa por
   * ClientDashboardHojas.vue cuando activeTab==='resumen'). */
  organizationId?: string
}>()

const { t, locale } = useI18n()

const activeTab = defineModel<string>('activeTab', { default: 'resumen' })

const tabs = computed<TabDef[]>(() => props.tabs ?? buildDashboardTabs(props.dashboard, t, locale.value as Locale))
const activeCategory = computed(() => props.dashboard.categories.find((c) => `cat:${c.categoria}` === activeTab.value))

// Sin esto la pestaña se veía "pelada" (directo a las tarjetas, sin
// contexto de qué servicio/pestaña se está viendo) — mismo problema que ya
// se había resuelto para el admin (HigieneIndustrialPanel.vue) pero nunca
// para el cliente, porque ninguno de los dos lo tenía acá, en el shell
// compartido. `tabs` ya trae la etiqueta traducida de cada pestaña — no
// hace falta un mapa aparte.
const currentTabLabel = computed(() => tabs.value.find((tab) => tab.key === activeTab.value)?.label ?? '')

const bannerTitle = computed(() => {
  const parts = [
    serviceLabel(props.dashboard.service.slug, props.dashboard.service.nombre, locale.value as Locale),
    props.orgLabel,
    currentTabLabel.value,
  ].filter(Boolean)
  return parts.join(' — ')
})
</script>

<template>
  <div class="grid gap-6" :class="hideSidebar ? '' : 'lg:grid-cols-[220px_1fr] lg:items-start'">
    <DashboardSidebar v-if="!hideSidebar" v-model="activeTab" :tabs="tabs" :services="[]" selected-service-slug="" />

    <div class="grid gap-6">
      <SectionTitleBanner :title="bannerTitle" />

      <slot name="after-banner" />

      <ResumenTab
        v-if="activeTab === 'resumen'"
        :dashboard="dashboard"
        :organization-id="organizationId"
        @view-all-non-conformities="activeTab = 'no-conformidades'"
      />
      <CategoryTab
        v-else-if="activeCategory"
        :category="activeCategory"
        :trend="dashboard.trend"
        :editable="props.editableReadings ?? false"
        :correct-reading="props.correctReading"
      />
      <ComparativoTab v-else-if="activeTab === 'comparativo'" :categories="dashboard.categories" />
      <NoConformidadesTab
        v-else-if="activeTab === 'no-conformidades'"
        :service-slug="dashboard.service.slug"
        :organization-id="organizationId"
      />
      <HistorialTab
        v-else-if="activeTab === 'historial'"
        :fetch-history="fetchHistory"
        :fetch-upload-detail="fetchUploadDetail"
      />
      <ReportesTab v-else-if="activeTab === 'reportes'" :dashboard="dashboard" />
    </div>
  </div>
</template>
