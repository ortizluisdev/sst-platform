<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import type { CategorySummary, TrendPoint, WorkPointReading } from '@/types/dashboard'
import SummaryCard from '../SummaryCard.vue'
import TrendChart from '../TrendChart.vue'
import CorrectReadingModal from '../CorrectReadingModal.vue'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'

const props = defineProps<{
  category: CategorySummary
  trend: TrendPoint[]
  /** Solo el admin lo pasa (vía DashboardShell) — el cliente nunca lo ve. */
  editable?: boolean
  correctReading?: (readingId: string, valor: number, reason: string) => Promise<void>
}>()
const { t } = useI18n()

interface EditTarget {
  reading: WorkPointReading
  variableNombre: string
  unidadMedida: string
}

const editTarget = ref<EditTarget | null>(null)
const errorMessage = ref('')

function openEdit(reading: WorkPointReading, variableNombre: string, unidadMedida: string) {
  errorMessage.value = ''
  editTarget.value = { reading, variableNombre, unidadMedida }
}

async function handleCorrect(valor: number, reason: string) {
  if (!editTarget.value || !props.correctReading) return
  try {
    await props.correctReading(editTarget.value.reading.id, valor, reason)
    editTarget.value = null
  } catch {
    errorMessage.value = t('dashboard.category.correctModal.genericError')
  }
}

interface WorkPointRow {
  codigo: string
  nombre: string
  areaPlanta: string
  valores: Record<string, WorkPointReading | undefined>
}

/** Pivota las lecturas (una lista por variable) a una fila por punto de
 * trabajo con una columna por variable — así se lee "de campo": todo lo
 * medido en un mismo puesto, en una sola fila. */
const workPointRows = computed<WorkPointRow[]>(() => {
  const map = new Map<string, WorkPointRow>()
  for (const variable of props.category.variables) {
    for (const reading of variable.readings) {
      const row = map.get(reading.workPointCodigo) ?? {
        codigo: reading.workPointCodigo,
        nombre: reading.workPointNombre,
        areaPlanta: reading.areaPlanta,
        valores: {},
      }
      row.valores[variable.definitionId] = reading
      map.set(reading.workPointCodigo, row)
    }
  }
  return [...map.values()].sort((a, b) => a.codigo.localeCompare(b.codigo))
})
</script>

<template>
  <div class="grid gap-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        v-for="v in category.variables"
        :key="v.definitionId"
        :titulo="v.nombre"
        :valor="`${v.promedio} ${v.unidadMedida}`"
        :cumplimiento-pct="v.cumplimientoPct"
        :estado="v.estado"
      />
    </div>

    <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <p class="border-b border-line-strong px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.category.detailHeading') }}
      </p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.category.workPoint') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.category.areaPlant') }}</th>
              <th v-for="v in category.variables" :key="v.definitionId" class="px-4 py-3 font-semibold">
                {{ v.nombre }}
                <span class="block font-normal normal-case opacity-70">{{ v.normativaRef }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in workPointRows" :key="row.codigo" class="border-t border-line">
              <td class="px-4 py-3 text-navy-900">
                {{ row.nombre }}
                <span class="block text-xs text-navy-700 opacity-60">{{ row.codigo }}</span>
              </td>
              <td class="px-4 py-3 text-navy-700">{{ row.areaPlanta }}</td>
              <td v-for="v in category.variables" :key="v.definitionId" class="px-4 py-3">
                <span v-if="row.valores[v.definitionId]" class="inline-flex items-center gap-1.5 font-mono text-navy-900">
                  <span :class="SEMAPHORE_STYLES[row.valores[v.definitionId]!.semaforo].dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
                  {{ row.valores[v.definitionId]!.valor }} {{ v.unidadMedida }}
                  <span v-if="row.valores[v.definitionId]!.isCorrected" :title="row.valores[v.definitionId]!.correctionReason ?? ''" class="text-[10px] font-sans italic text-navy-700/60">
                    ({{ t('dashboard.category.correctedTag') }})
                  </span>
                  <button
                    v-if="props.editable"
                    type="button"
                    class="text-navy-700/40 hover:text-navy-900"
                    :aria-label="t('dashboard.category.editLabel')"
                    @click="openEdit(row.valores[v.definitionId]!, v.nombre, v.unidadMedida)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                </span>
                <span v-else class="text-navy-700 opacity-40">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-lg border border-dashed border-line-strong bg-white p-8 text-center text-sm text-navy-700 opacity-70">
      {{ t('dashboard.category.heatmapPlaceholder') }}
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <TrendChart
        v-for="v in category.variables"
        :key="v.definitionId"
        :titulo="`${t('dashboard.category.trendPrefix')}${v.nombre}`"
        :unidad-medida="v.unidadMedida"
        :codigo="v.codigo"
        :trend="trend"
      />
    </div>

    <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <CorrectReadingModal
      v-if="editTarget"
      :work-point-nombre="editTarget.reading.workPointNombre"
      :variable-nombre="editTarget.variableNombre"
      :current-value="editTarget.reading.valor"
      :unidad-medida="editTarget.unidadMedida"
      @submit="handleCorrect"
      @cancel="editTarget = null"
    />
  </div>
</template>
