<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DashboardData } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import ComplianceRing from '../ComplianceRing.vue'
import ComparisonTable from '../ComparisonTable.vue'
import { formatDate } from '@/utils/formatDate'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, tm, locale } = useI18n()

function formatNorma(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} - ${max}`
  if (max != null) return `<= ${max}`
  if (min != null) return `>= ${min}`
  return ''
}

function escapeCsv(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function exportCsv() {
  const headers = tm('dashboard.reportes.csvHeaders') as unknown as string[]
  const rows: string[] = [headers.join(',')]
  for (const categoria of props.dashboard.categories) {
    for (const v of categoria.variables) {
      rows.push(
        [categoria.categoria, v.nombre, v.promedio, v.unidadMedida, formatNorma(v.limiteMin, v.limiteMax), v.cumplimientoPct, v.estado]
          .map(escapeCsv)
          .join(','),
      )
    }
  }
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const fecha = props.dashboard.lastUpdated?.slice(0, 10) ?? 'sin-fecha'
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-${props.dashboard.service.slug}-${fecha}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        class="rounded-sm border border-navy-900 bg-navy-900 px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-transparent hover:text-navy-900"
        @click="exportCsv"
      >
        {{ t('dashboard.reportes.exportCsv') }}
      </button>
      <button
        type="button"
        class="rounded-sm border border-navy-900 px-5 py-2.5 text-sm font-medium text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
        @click="printReport"
      >
        {{ t('dashboard.reportes.exportPdf') }}
      </button>
    </div>

    <div class="rounded-lg border border-line-strong bg-white p-5">
      <p class="font-serif text-lg font-semibold text-navy-900">{{ t('dashboard.reportes.reportTitlePrefix') }}{{ dashboard.service.nombre }}</p>
      <p class="text-xs text-navy-700 opacity-70">
        {{ t('dashboard.reportes.generatedOn') }}{{ formatDate(new Date(), locale as Locale) }} · {{ dashboard.totalWorkPoints }}{{ t('dashboard.resumen.workPointsSuffix') }}
      </p>
    </div>

    <ComplianceRing :compliance="dashboard.globalCompliance" />
    <ComparisonTable :categories="dashboard.categories" />
  </div>
</template>
