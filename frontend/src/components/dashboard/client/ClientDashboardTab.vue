<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ListChecks, CheckCircle2, XCircle, Percent, Gauge, Bell } from 'lucide-vue-next'
import type { DashboardData } from '@/types/dashboard'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { formatSummaryValue } from '@/utils/formatSummaryValue'
import type { Locale } from '@/i18n'
import SummaryCard from '../SummaryCard.vue'
import ClientStatCard from './ClientStatCard.vue'
import { HEADLINE_CODE_POR_CATEGORIA } from './headlineVariables'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

const noCumplen = computed(() => props.dashboard.globalCompliance.amarillo + props.dashboard.globalCompliance.rojo)

const headlineCards = computed(() =>
  Object.entries(HEADLINE_CODE_POR_CATEGORIA)
    .map(([categoria, codigo]) => {
      const categoriaData = props.dashboard.categories.find((c) => c.categoria === categoria)
      const variable = categoriaData?.variables.find((v) => v.codigo === codigo)
      return { categoria, variable }
    })
    .filter((entry) => entry.variable),
)

function escapeCsv(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function exportCsv() {
  const rows: string[] = [['Indicador', 'Valor'].join(',')]
  rows.push(['Total de mediciones', props.dashboard.globalCompliance.total].map(escapeCsv).join(','))
  rows.push(['Mediciones que cumplen norma', props.dashboard.globalCompliance.verde].map(escapeCsv).join(','))
  rows.push(['Mediciones que no cumplen norma', noCumplen.value].map(escapeCsv).join(','))
  rows.push(['Cumplimiento global (%)', props.dashboard.globalCompliance.pct].map(escapeCsv).join(','))
  rows.push(['Riesgo global promedio', t('dashboard.clientDashboardTab.pendiente')].map(escapeCsv).join(','))
  rows.push(['Alertas activas', t('dashboard.clientDashboardTab.pendiente')].map(escapeCsv).join(','))
  for (const { categoria, variable } of headlineCards.value) {
    if (!variable) continue
    rows.push([categoria, formatSummaryValue(variable)].map(escapeCsv).join(','))
  }
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const fecha = props.dashboard.lastUpdated?.slice(0, 10) ?? 'sin-fecha'
  const link = document.createElement('a')
  link.href = url
  link.download = `dashboard-${props.dashboard.service.slug}-${fecha}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}

// ClientDashboardHojas.vue renderiza estos botones en su cabecera (junto al
// título de la hoja activa), no acá — los expone vía ref en vez de vía
// Teleport porque el target de un Teleport debe existir FUERA del árbol de
// componentes que se está montando; acá el target vive en el padre que se
// monta en la misma pasada, así que Vue nunca lo encuentra a tiempo.
defineExpose({ exportCsv, printReport })
</script>

<template>
  <div class="grid gap-6">
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientDashboardTab.indicadoresGlobales') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientStatCard :titulo="t('dashboard.clientDashboardTab.totalMediciones')" :valor="String(dashboard.globalCompliance.total)" :icon="ListChecks" />
        <ClientStatCard :titulo="t('dashboard.clientDashboardTab.cumplenNorma')" :valor="String(dashboard.globalCompliance.verde)" :icon="CheckCircle2" />
        <ClientStatCard :titulo="t('dashboard.clientDashboardTab.noCumplenNorma')" :valor="String(noCumplen)" :icon="XCircle" />
        <ClientStatCard :titulo="t('dashboard.clientDashboardTab.cumplimientoGlobal')" :valor="`${dashboard.globalCompliance.pct}%`" :icon="Percent" />
        <ClientStatCard :titulo="t('dashboard.clientDashboardTab.riesgoGlobal')" :valor="t('dashboard.clientDashboardTab.pendiente')" pendiente :icon="Gauge" />
        <ClientStatCard :titulo="t('dashboard.clientDashboardTab.alertasActivas')" :valor="t('dashboard.clientDashboardTab.pendiente')" pendiente :icon="Bell" />
      </div>
    </div>

    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientDashboardTab.valorCabecera') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          v-for="{ categoria, variable } in headlineCards"
          :key="categoria"
          :titulo="categoryLabel(categoria, locale as Locale)"
          :valor="formatSummaryValue(variable!)"
          :cumplimiento-pct="variable!.cumplimientoPct"
          :estado="variable!.estado"
          :icon="iconForCategory(categoria)"
        />
      </div>
    </div>
  </div>
</template>
