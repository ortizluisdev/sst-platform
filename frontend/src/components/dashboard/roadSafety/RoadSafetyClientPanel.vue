<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionTitleBanner from '../SectionTitleBanner.vue'
import RoadSafetyHoja1Tab from './RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from './RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from './RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from './RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from './RoadSafetyAlertasTab.vue'
import RoadSafetyReportModal from './RoadSafetyReportModal.vue'
import type { RoadSafetyReportTipo } from '@/types/roadSafety'

// La navegación entre hojas vive en el sidebar (DashboardSidebar.vue), igual
// que "Dashboard" en Higiene Industrial — antes este panel tenía su propia
// barra de pestañas interna, lo que lo hacía verse distinto (dos niveles de
// navegación en vez de uno) y quedaba fuera del acordeón del sidebar.
const props = defineProps<{ activeTab: 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' }>()

const { t } = useI18n()

const showReportModal = ref(false)
const reportTipo = computed<RoadSafetyReportTipo>(() => {
  if (props.activeTab === 'hoja2') return 'h2'
  if (props.activeTab === 'hoja3') return 'h3'
  if (props.activeTab === 'hoja4') return 'h4'
  return 'h1'
})
const showReportButton = computed(() => props.activeTab !== 'alertas')

const currentTitle = computed(() => t(`roadSafety.tabs.${props.activeTab}`))
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="currentTitle" />

    <div v-if="showReportButton" class="flex justify-end print:hidden">
      <button
        type="button"
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream hover:opacity-90"
        @click="showReportModal = true"
      >
        {{ t('roadSafety.reports.generarReporte') }}
      </button>
    </div>

    <RoadSafetyHoja1Tab v-if="activeTab === 'hoja1'" />
    <RoadSafetyHoja2Tab v-else-if="activeTab === 'hoja2'" />
    <RoadSafetyHoja3Tab v-else-if="activeTab === 'hoja3'" />
    <RoadSafetyHoja4Tab v-else-if="activeTab === 'hoja4'" />
    <RoadSafetyAlertasTab v-else-if="activeTab === 'alertas'" />

    <RoadSafetyReportModal v-if="showReportModal" :tipo="reportTipo" @close="showReportModal = false" />
  </div>
</template>
