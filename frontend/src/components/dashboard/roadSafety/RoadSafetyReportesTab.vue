<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import RoadSafetyReportModal from './RoadSafetyReportModal.vue'
import type { RoadSafetyReportTipo } from '@/types/roadSafety'

const props = defineProps<{ organizationId?: string }>()
const { t } = useI18n()

const TIPOS: RoadSafetyReportTipo[] = ['h1', 'h2', 'h3', 'h4']

const openTipo = ref<RoadSafetyReportTipo | null>(null)
</script>

<template>
  <div class="grid gap-4">
    <p class="text-sm text-navy-700 opacity-70">{{ t('roadSafety.reportesTab.subtitle') }}</p>

    <div class="grid gap-3 sm:grid-cols-2">
      <button
        v-for="tipo in TIPOS"
        :key="tipo"
        type="button"
        class="flex items-center gap-3 rounded-lg border border-line-strong bg-white p-4 text-left transition-colors hover:border-sky-400 hover:bg-sky-100/40"
        @click="openTipo = tipo"
      >
        <FileText class="h-5 w-5 shrink-0 text-navy-700/60" aria-hidden="true" />
        <span class="text-sm font-semibold text-navy-900">{{ t(`roadSafety.reports.titulo.${tipo}`) }}</span>
      </button>
    </div>

    <RoadSafetyReportModal
      v-if="openTipo"
      :organization-id="props.organizationId"
      :tipo="openTipo"
      @close="openTipo = null"
    />
  </div>
</template>
