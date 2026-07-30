<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Percent, XCircle, ListChecks } from 'lucide-vue-next'
import type { DashboardData } from '@/types/dashboard'
import { categoryLabel } from '@/utils/categoryLabel'
import type { Locale } from '@/i18n'
import TrendChart from '../TrendChart.vue'
import ClientStatCard from './ClientStatCard.vue'
import { HEADLINE_CODE_POR_CATEGORIA } from './headlineVariables'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

const variablesEnIncumplimiento = computed(() =>
  props.dashboard.categories
    .flatMap((c) => c.variables)
    .filter((v) => v.estado === 'AMARILLO' || v.estado === 'ROJO').length,
)

const trendCharts = computed(() =>
  Object.entries(HEADLINE_CODE_POR_CATEGORIA)
    .map(([categoria, codigo]) => {
      const categoriaData = props.dashboard.categories.find((c) => c.categoria === categoria)
      const variable = categoriaData?.variables.find((v) => v.codigo === codigo)
      return { categoria, codigo, variable }
    })
    .filter((entry) => entry.variable),
)

const PENDIENTES = [
  'tendenciaGlobal',
  'probabilidadIncumplimiento',
  'riesgoSalud',
  'puntajeIntervencion',
  'nivelPrioridad',
  'matrizPosicion',
  'evolucionIgho',
] as const
</script>

<template>
  <div class="grid gap-6">
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientAnalisisTab.indicesGlobales') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientStatCard :titulo="t('dashboard.clientAnalisisTab.cumplimientoGlobal')" :valor="`${dashboard.globalCompliance.pct}%`" :icon="Percent" />
        <ClientStatCard :titulo="t('dashboard.clientAnalisisTab.variablesIncumplimiento')" :valor="String(variablesEnIncumplimiento)" :icon="XCircle" />
        <ClientStatCard :titulo="t('dashboard.clientAnalisisTab.medicionesRealizadas')" :valor="String(dashboard.globalCompliance.total)" :icon="ListChecks" />
        <ClientStatCard
          v-for="key in PENDIENTES"
          :key="key"
          :titulo="t(`dashboard.clientAnalisisTab.${key}`)"
          :valor="t('dashboard.clientAnalisisTab.pendiente')"
          pendiente
        />
      </div>
    </div>

    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientAnalisisTab.tendenciaHistorica') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <TrendChart
          v-for="{ categoria, codigo, variable } in trendCharts"
          :key="categoria"
          :titulo="categoryLabel(categoria, locale as Locale)"
          :unidad-medida="variable!.unidadMedida"
          :codigo="codigo"
          :trend="dashboard.trend"
        />
      </div>
    </div>
  </div>
</template>
