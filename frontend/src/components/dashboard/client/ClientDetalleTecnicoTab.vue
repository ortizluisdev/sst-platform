<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Filter } from 'lucide-vue-next'
import type { CategoryCardStatus, DashboardData, DashboardFilters, UploadHistoryEntry, VariableSummary } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { formatDate } from '@/utils/formatDate'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'

const props = defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchFilteredDashboard: (filters: DashboardFilters) => Promise<DashboardData>
}>()
const { t, locale } = useI18n()

const TIPO_LABEL: Record<string, string> = { MEDICION: 'M', CALCULO: 'C', INSPECCION: 'I' }
const TIPO_BADGE: Record<string, string> = {
  MEDICION: 'bg-sky-100 text-sky-700 border-sky-300',
  CALCULO: 'bg-violet-100 text-violet-700 border-violet-300',
  INSPECCION: 'bg-amber-100 text-amber-700 border-amber-300',
}

// Datos realmente mostrados — arrancan en la prop (última carga, sin
// filtrar) y se reemplazan por la respuesta filtrada del backend cuando el
// usuario cambia algún selector (el backend recalcula cumple/no-cumple con
// la lógica real; nunca se recalcula en el navegador).
const displayDashboard = ref<DashboardData>(props.dashboard)
const uploadHistory = ref<UploadHistoryEntry[]>([])
const selectedUploadId = ref('')
const selectedArea = ref('')
const selectedProceso = ref('')
const filtering = ref(false)

onMounted(async () => {
  uploadHistory.value = await props.fetchHistory()
})

watch([selectedUploadId, selectedArea, selectedProceso], async ([uploadId, areaPlanta, procesoActividad]) => {
  filtering.value = true
  try {
    displayDashboard.value = await props.fetchFilteredDashboard({
      uploadId: uploadId || undefined,
      areaPlanta: areaPlanta || undefined,
      procesoActividad: procesoActividad || undefined,
    })
  } finally {
    filtering.value = false
  }
})

function limpiarFiltros() {
  selectedUploadId.value = ''
  selectedArea.value = ''
  selectedProceso.value = ''
}

/** Estado global de la categoría: el peor caso entre sus variables — si una
 * sola variable está en rojo, la tarjeta de la categoría debe mostrarlo,
 * aunque el resto cumpla (a diferencia del estado por variable, que resume
 * un promedio, esta insignia resume "¿hay algún problema aquí?"). */
function categoriaEstado(variables: VariableSummary[]): CategoryCardStatus {
  if (variables.some((v) => v.estado === 'ROJO')) return 'ROJO'
  if (variables.some((v) => v.estado === 'AMARILLO')) return 'AMARILLO'
  if (variables.some((v) => v.estado === 'VERDE')) return 'VERDE'
  return 'SIN_DATOS'
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
  for (const categoria of displayDashboard.value.categories) {
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
  const fecha = displayDashboard.value.lastUpdated?.slice(0, 10) ?? 'sin-fecha'
  const link = document.createElement('a')
  link.href = url
  link.download = `detalle-tecnico-${displayDashboard.value.service.slug}-${fecha}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}

// Ver nota equivalente en ClientDashboardTab.vue: ClientDashboardHojas.vue
// invoca esto vía ref, no vía Teleport (el target vive en el padre que se
// monta en la misma pasada que este componente, así que Teleport nunca lo
// encuentra a tiempo).
defineExpose({ exportCsv, printReport })
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border border-line-strong bg-white p-4 print:hidden">
      <div class="flex min-w-[160px] flex-col gap-1">
        <label class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ t('dashboard.detalleTecnico.filtroFecha') }}</label>
        <select v-model="selectedUploadId" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroUltima') }}</option>
          <option v-for="u in uploadHistory" :key="u.id" :value="u.id">{{ formatDate(u.fechaEvaluacion, locale as Locale) }}</option>
        </select>
      </div>
      <div class="flex min-w-[160px] flex-col gap-1">
        <label class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ t('dashboard.detalleTecnico.filtroArea') }}</label>
        <select v-model="selectedArea" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroTodas') }}</option>
          <option v-for="area in displayDashboard.filtrosDisponibles.areasPlanta" :key="area" :value="area">{{ area }}</option>
        </select>
      </div>
      <div class="flex min-w-[160px] flex-col gap-1">
        <label class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ t('dashboard.detalleTecnico.filtroProceso') }}</label>
        <select v-model="selectedProceso" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroTodos') }}</option>
          <option v-for="proceso in displayDashboard.filtrosDisponibles.procesosActividad" :key="proceso" :value="proceso">{{ proceso }}</option>
        </select>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-sm border border-navy-900 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
        @click="limpiarFiltros"
      >
        <Filter class="h-4 w-4" aria-hidden="true" />
        {{ t('dashboard.detalleTecnico.limpiarFiltros') }}
      </button>
    </div>

    <p v-if="filtering" class="text-sm text-navy-700 opacity-70">{{ t('dashboard.detalleTecnico.filtrando') }}</p>
    <p
      v-else-if="displayDashboard.categories.every((c) => c.variables.length === 0)"
      class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700"
    >
      {{ t('dashboard.detalleTecnico.sinResultados') }}
    </p>

    <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div
        v-for="(categoria, index) in displayDashboard.categories.filter((c) => c.variables.length > 0)"
        :key="categoria.categoria"
        class="flex flex-col overflow-hidden rounded-lg border border-line-strong bg-white"
      >
        <div class="flex items-center justify-between gap-2 border-b border-line-strong bg-sky-100 px-4 py-3">
          <div class="flex items-center gap-2">
            <component :is="iconForCategory(categoria.categoria)" class="h-4.5 w-4.5 shrink-0 text-navy-700" aria-hidden="true" />
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ index + 1 }}. {{ categoryLabel(categoria.categoria, locale as Locale) }}
            </p>
          </div>
          <span
            :class="[SEMAPHORE_STYLES[categoriaEstado(categoria.variables)].bg, SEMAPHORE_STYLES[categoriaEstado(categoria.variables)].text, SEMAPHORE_STYLES[categoriaEstado(categoria.variables)].border]"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
          >
            <span :class="SEMAPHORE_STYLES[categoriaEstado(categoria.variables)].dot" class="h-1.5 w-1.5 rounded-full" />
            {{ t(SEMAPHORE_LABEL_KEY[categoriaEstado(categoria.variables)]) }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wide text-navy-700 opacity-70">
                <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.parametro') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.resultado') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('dashboard.detalleTecnico.tipo') }}</th>
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
                <td class="px-4 py-3 text-navy-700">{{ v.normativaRef ?? formatNorma(v.limiteMin, v.limiteMax) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-auto border-t border-line-strong bg-cream px-4 py-2 text-xs text-navy-700 opacity-70">
          {{ t('dashboard.detalleTecnico.instrumentoPrefix') }}{{ instrumentoDe(categoria.variables) }}
        </p>
      </div>
    </div>
  </div>
</template>
