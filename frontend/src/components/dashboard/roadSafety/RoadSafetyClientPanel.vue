<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck, Truck, Users, Map, AlertTriangle } from 'lucide-vue-next'
import RoadSafetyHoja1Tab from './RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from './RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from './RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from './RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from './RoadSafetyAlertasTab.vue'
import RoadSafetyReportModal from './RoadSafetyReportModal.vue'
import type { RoadSafetyReportTipo } from '@/types/roadSafety'

const { t } = useI18n()

const TABS = [
  { key: 'hoja1', icon: ClipboardCheck },
  { key: 'hoja2', icon: Truck },
  { key: 'hoja3', icon: Users },
  { key: 'hoja4', icon: Map },
  { key: 'alertas', icon: AlertTriangle },
] as const

const activeTab = ref<(typeof TABS)[number]['key']>('hoja1')

const showReportModal = ref(false)
const reportTipo = computed<RoadSafetyReportTipo>(() => {
  if (activeTab.value === 'hoja2') return 'h2'
  if (activeTab.value === 'hoja3') return 'h3'
  if (activeTab.value === 'hoja4') return 'h4'
  return 'h1'
})
const showReportButton = computed(() => activeTab.value !== 'alertas')
</script>

<template>
  <div class="grid gap-6">
    <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="flex flex-wrap gap-1 border-b border-line-strong bg-sky-50 p-2">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          class="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-700/70 hover:bg-white/60'"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
          {{ t(`roadSafety.tabs.${tab.key}`) }}
        </button>
      </div>
      <div class="p-4">
        <div v-if="showReportButton" class="mb-4 flex justify-end">
          <button
            type="button"
            class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream hover:opacity-90"
            @click="showReportModal = true"
          >
            {{ t('roadSafety.reports.generarReporte') }}
          </button>
        </div>

        <!-- Sin <Transition>: ver nota en RoadSafetyAdminPanel.vue — mode="out-in"
        quedaba atascado a medio animar mostrando la pestaña anterior. -->
        <RoadSafetyHoja1Tab v-if="activeTab === 'hoja1'" />
        <RoadSafetyHoja2Tab v-else-if="activeTab === 'hoja2'" />
        <RoadSafetyHoja3Tab v-else-if="activeTab === 'hoja3'" />
        <RoadSafetyHoja4Tab v-else-if="activeTab === 'hoja4'" />
        <RoadSafetyAlertasTab v-else-if="activeTab === 'alertas'" />
      </div>
    </div>

    <RoadSafetyReportModal v-if="showReportModal" :tipo="reportTipo" @close="showReportModal = false" />
  </div>
</template>
