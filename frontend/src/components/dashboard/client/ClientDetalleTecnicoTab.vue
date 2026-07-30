<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DashboardData, VariableSummary } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

const TIPO_LABEL: Record<string, string> = { MEDICION: 'M', CALCULO: 'C', INSPECCION: 'I' }
const TIPO_BADGE: Record<string, string> = {
  MEDICION: 'bg-sky-100 text-sky-700 border-sky-300',
  CALCULO: 'bg-violet-100 text-violet-700 border-violet-300',
  INSPECCION: 'bg-amber-100 text-amber-700 border-amber-300',
}

function instrumentoDe(variables: VariableSummary[]): string {
  const conDato = variables.find((v) => v.instrumento)
  return conDato?.instrumento ?? t('dashboard.detalleTecnico.pendiente')
}

function formatNorma(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} – ${max}`
  if (max != null) return `≤ ${max}`
  if (min != null) return `≥ ${min}`
  return '—'
}

function escapeCsv(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function exportCsv() {
  const headers = ['Categoría', 'Parámetro', 'Resultado', 'Unidad', 'Tipo', 'Incertidumbre', 'Norma/Ref']
  const rows: string[] = [headers.join(',')]
  for (const categoria of props.dashboard.categories) {
    for (const v of categoria.variables) {
      rows.push(
        [
          categoria.categoria,
          v.nombre,
          v.promedio,
          v.unidadMedida,
          v.tipo ? TIPO_LABEL[v.tipo] : t('dashboard.detalleTecnico.pendiente'),
          v.incertidumbre ?? t('dashboard.detalleTecnico.pendiente'),
          v.normativaRef ?? formatNorma(v.limiteMin, v.limiteMax),
        ]
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
  link.download = `detalle-tecnico-${props.dashboard.service.slug}-${fecha}.csv`
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
        {{ t('dashboard.detalleTecnico.exportCsv') }}
      </button>
      <button
        type="button"
        class="rounded-sm border border-navy-900 px-5 py-2.5 text-sm font-medium text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
        @click="printReport"
      >
        {{ t('dashboard.detalleTecnico.exportPdf') }}
      </button>
    </div>

    <div v-for="categoria in dashboard.categories" :key="categoria.categoria" class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="flex items-center gap-2 border-b border-line-strong bg-sky-100 px-4 py-3">
        <component :is="iconForCategory(categoria.categoria)" class="h-4.5 w-4.5 shrink-0 text-navy-700" aria-hidden="true" />
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-700">{{ categoryLabel(categoria.categoria, locale as Locale) }}</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase tracking-wide text-navy-700 opacity-70">
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.parametro') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.resultado') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.tipo') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.incertidumbre') }}</th>
              <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.norma') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in categoria.variables" :key="v.definitionId" class="border-t border-line">
              <td class="px-4 py-3 text-navy-900">{{ v.nombre }}</td>
              <td class="px-4 py-3 font-mono text-navy-900">{{ v.promedio }} {{ v.unidadMedida }}</td>
              <td class="px-4 py-3">
                <span
                  v-if="v.tipo"
                  :class="TIPO_BADGE[v.tipo]"
                  class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                >
                  {{ TIPO_LABEL[v.tipo] }}
                </span>
                <span v-else class="text-navy-700 opacity-40">{{ t('dashboard.detalleTecnico.pendiente') }}</span>
              </td>
              <td class="px-4 py-3 text-navy-700">
                {{ v.incertidumbre ?? t('dashboard.detalleTecnico.pendiente') }}
              </td>
              <td class="px-4 py-3 text-navy-700">{{ v.normativaRef ?? formatNorma(v.limiteMin, v.limiteMax) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="border-t border-line-strong bg-cream px-4 py-2 text-xs text-navy-700 opacity-70">
        {{ t('dashboard.detalleTecnico.instrumentoPrefix') }}{{ instrumentoDe(categoria.variables) }}
      </p>
    </div>
  </div>
</template>
