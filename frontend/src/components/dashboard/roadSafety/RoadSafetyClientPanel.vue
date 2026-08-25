<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionTitleBanner from '../SectionTitleBanner.vue'
import RoadSafetyResumenTab from './RoadSafetyResumenTab.vue'
import RoadSafetyHoja1Tab from './RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from './RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from './RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from './RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from './RoadSafetyAlertasTab.vue'
import RoadSafetyHistorialTab from './RoadSafetyHistorialTab.vue'
import RoadSafetyReportesTab from './RoadSafetyReportesTab.vue'
import RoadSafetyReportModal from './RoadSafetyReportModal.vue'
import type { RoadSafetyReportTipo } from '@/types/roadSafety'

// La navegación entre hojas vive en el sidebar (DashboardSidebar.vue), igual
// que "Dashboard" en Higiene Industrial — antes este panel tenía su propia
// barra de pestañas interna, lo que lo hacía verse distinto (dos niveles de
// navegación en vez de uno) y quedaba fuera del acordeón del sidebar.
//
// 'dashboard' y 'resumen' muestran EL MISMO componente (RoadSafetyResumenTab)
// — "Dashboard" es ahora la etiqueta de agrupación del acordeón (ver
// DashboardSidebar.vue, sheets[0]), clickeable igual que en Higiene
// Industrial, pero su contenido es idéntico al de "Hoja 1" (el primer hijo)
// en vez de un panel vacío — mismo criterio que Higiene Industrial, donde
// "Dashboard" (key 'resumen') también muestra el sub-estado 'hoja1' por
// defecto. RoadSafetyDashboardTab.vue (el componente viejo) NO se borra:
// sigue siendo usado por RoadSafetyAdminPanel.vue, un panel distinto fuera
// de este alcance.
const props = defineProps<{
  activeTab: 'dashboard' | 'resumen' | 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' | 'historial' | 'reportes'
}>()

const { t } = useI18n()

const currentTitle = computed(() => {
  const key = props.activeTab === 'dashboard' ? 'resumen' : props.activeTab
  return t(`roadSafety.tabs.${key}`)
})

// Mismo tratamiento que "Generar reporte" en Higiene Industrial
// (ClientDashboardHojas.vue): botón en línea con el banner, solo visible en
// las hojas que tienen reporte propio (H1-H4) — 'alertas'/'historial'/
// 'reportes' no lo necesitan (Reportes ya lista los 4 desde
// RoadSafetyReportesTab.vue). 'dashboard'/'resumen' (mostradas como "Hoja 1 ·
// Generalidad") también llevan el botón de Reporte H1: consumen los mismos
// datos que devuelve getDashboardHoja1() en el backend (cumplimiento PESV +
// inventario) que arma el PDF/CSV de "Reporte H1" — la numeración interna de
// claves ('hoja1'..'hoja4') no coincide 1:1 con el texto "Hoja N" mostrado
// (deuda preexistente fuera de este alcance), así que el mapeo va por
// contenido real, no por nombre de clave.
const REPORT_TIPOS: Record<string, RoadSafetyReportTipo> = {
  dashboard: 'h1',
  resumen: 'h1',
  hoja1: 'h1',
  hoja2: 'h2',
  hoja3: 'h3',
  hoja4: 'h4',
}
const reportTipo = computed<RoadSafetyReportTipo | null>(() => REPORT_TIPOS[props.activeTab] ?? null)
const showReportModal = ref(false)
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="currentTitle">
      <template v-if="reportTipo" #actions>
        <button
          type="button"
          class="rounded-sm bg-white px-4 py-1.5 text-xs font-semibold text-navy-900 transition-opacity hover:opacity-90 print:hidden"
          @click="showReportModal = true"
        >
          {{ t('dashboard.clientDashboardTab.generateReport') }}
        </button>
      </template>
    </SectionTitleBanner>

    <RoadSafetyResumenTab v-if="activeTab === 'dashboard' || activeTab === 'resumen'" />
    <RoadSafetyHoja1Tab v-else-if="activeTab === 'hoja1'" />
    <RoadSafetyHoja2Tab v-else-if="activeTab === 'hoja2'" />
    <RoadSafetyHoja3Tab v-else-if="activeTab === 'hoja3'" />
    <RoadSafetyHoja4Tab v-else-if="activeTab === 'hoja4'" />
    <RoadSafetyAlertasTab v-else-if="activeTab === 'alertas'" />
    <RoadSafetyHistorialTab v-else-if="activeTab === 'historial'" />
    <RoadSafetyReportesTab v-else-if="activeTab === 'reportes'" />

    <RoadSafetyReportModal v-if="showReportModal && reportTipo" :tipo="reportTipo" @close="showReportModal = false" />
  </div>
</template>
