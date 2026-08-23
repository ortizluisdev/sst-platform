<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="currentTitle" />

    <RoadSafetyResumenTab v-if="activeTab === 'dashboard' || activeTab === 'resumen'" />
    <RoadSafetyHoja1Tab v-else-if="activeTab === 'hoja1'" />
    <RoadSafetyHoja2Tab v-else-if="activeTab === 'hoja2'" />
    <RoadSafetyHoja3Tab v-else-if="activeTab === 'hoja3'" />
    <RoadSafetyHoja4Tab v-else-if="activeTab === 'hoja4'" />
    <RoadSafetyAlertasTab v-else-if="activeTab === 'alertas'" />
    <RoadSafetyHistorialTab v-else-if="activeTab === 'historial'" />
    <RoadSafetyReportesTab v-else-if="activeTab === 'reportes'" />
  </div>
</template>
