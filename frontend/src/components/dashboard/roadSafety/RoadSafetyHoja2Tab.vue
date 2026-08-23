<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import {
  getRoadSafetyHoja2,
  correctRoadSafetyVehiculoField,
  RoadSafetyRequestError,
  type RoadSafetyFieldValue,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyVehiculo } from '@/types/roadSafety'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'
import RoadSafetyCorrectFieldModal from './RoadSafetyCorrectFieldModal.vue'
import { useToast } from '@/composables/useToast'
import ServiceDistributionDonut from '../ServiceDistributionDonut.vue'
import HorizontalBarChart from '../HorizontalBarChart.vue'
import { CHART_CATEGORY_COLORS } from '@/utils/chartTheme'
import { downloadCsv } from '@/utils/downloadCsv'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const isAdmin = computed(() => !!props.organizationId)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const vehiculos = ref<RoadSafetyVehiculo[]>([])
const filtroPlaca = ref('')

async function load() {
  status.value = 'loading'
  try {
    vehiculos.value = await getRoadSafetyHoja2({ organizationId: props.organizationId })
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError'))
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

const filtrados = computed(() =>
  vehiculos.value.filter((v) => v.placa.toLowerCase().includes(filtroPlaca.value.trim().toLowerCase())),
)

/** VehicleAlertState → CategoryCardStatus, para reutilizar SEMAPHORE_STYLES
 * (mismos colores que ya tenía este archivo — bg-emerald-50/amber-50/red-50
 * — ahora desde una sola fuente de verdad compartida con Higiene Industrial). */
const ALERTA_STATUS: Record<RoadSafetyVehiculo['alerta'], CategoryCardStatus> = {
  OK: 'VERDE',
  ALERTA: 'AMARILLO',
  VENCIDO: 'ROJO',
}

const tipoDonutSlices = computed(() => {
  const counts = new Map<string, number>()
  for (const v of vehiculos.value) {
    const tipo = v.tipo ?? t('roadSafety.hoja2.sinTipo')
    counts.set(tipo, (counts.get(tipo) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, value], i) => ({
    label,
    value,
    color: CHART_CATEGORY_COLORS[i % CHART_CATEGORY_COLORS.length],
  }))
})

const estadoFlotaItems = computed(() => [
  {
    label: t('roadSafety.alerta.vehiculo.OK'),
    value: vehiculos.value.filter((v) => v.alerta === 'OK').length,
    colorClass: 'bg-emerald-500',
  },
  {
    label: t('roadSafety.alerta.vehiculo.ALERTA'),
    value: vehiculos.value.filter((v) => v.alerta === 'ALERTA').length,
    colorClass: 'bg-amber-500',
  },
  {
    label: t('roadSafety.alerta.vehiculo.VENCIDO'),
    value: vehiculos.value.filter((v) => v.alerta === 'VENCIDO').length,
    colorClass: 'bg-red-500',
  },
])

const rendimientoItems = computed(() =>
  vehiculos.value
    .filter((v) => v.rendimientoKmGal != null && v.rendimientoBaseKmGal != null)
    .map((v) => {
      const max = Math.max(v.rendimientoKmGal!, v.rendimientoBaseKmGal!, 1) * 1.15
      return {
        placa: v.placa,
        actual: v.rendimientoKmGal!,
        base: v.rendimientoBaseKmGal!,
        pctActual: Math.max(2, (v.rendimientoKmGal! / max) * 100),
        pctBase: Math.max(2, (v.rendimientoBaseKmGal! / max) * 100),
      }
    }),
)

const vencimientosItems = computed(() => {
  const items: { label: string; value: number; display: string; colorClass: string; dias: number }[] = []
  for (const v of vehiculos.value) {
    if (v.diasSoat != null) {
      items.push({
        label: `${v.placa} · SOAT`,
        dias: v.diasSoat,
        value: Math.max(Math.abs(v.diasSoat), 3),
        display: v.diasSoat <= 0 ? t('roadSafety.hoja2.vencido') : `${v.diasSoat} d`,
        colorClass: v.diasSoat <= 0 ? 'bg-red-500' : v.diasSoat <= 30 ? 'bg-amber-500' : 'bg-emerald-500',
      })
    }
    if (v.diasRtm != null) {
      items.push({
        label: `${v.placa} · RTM`,
        dias: v.diasRtm,
        value: Math.max(Math.abs(v.diasRtm), 3),
        display: v.diasRtm <= 0 ? t('roadSafety.hoja2.vencido') : `${v.diasRtm} d`,
        colorClass: v.diasRtm <= 0 ? 'bg-red-500' : v.diasRtm <= 30 ? 'bg-amber-500' : 'bg-emerald-500',
      })
    }
  }
  return items.sort((a, b) => a.dias - b.dias)
})
const vencimientosMax = computed(() => Math.max(...vencimientosItems.value.map((i) => Math.abs(i.dias)), 30))

function exportCsv() {
  const headers = [
    t('roadSafety.hoja2.placa'),
    t('roadSafety.hoja2.tipo'),
    t('roadSafety.hoja2.ciudad'),
    t('roadSafety.hoja2.conductores'),
    t('roadSafety.hoja2.soatVence'),
    t('roadSafety.hoja2.diasSoat'),
    t('roadSafety.hoja2.rtmVence'),
    t('roadSafety.hoja2.diasRtm'),
    t('roadSafety.hoja2.comparendos'),
    t('roadSafety.hoja2.kmActual'),
    t('roadSafety.hoja2.pruebaFrenado'),
    t('roadSafety.hoja2.labrado'),
    t('roadSafety.hoja2.anomalia'),
    t('roadSafety.hoja2.alerta'),
  ]
  const rows = filtrados.value.map((v) => [
    v.placa,
    v.tipo ?? '',
    v.ciudad ?? '',
    v.conductoresAsignados ?? '',
    v.soatVence ?? '',
    v.diasSoat ?? '',
    v.rtmVence ?? '',
    v.diasRtm ?? '',
    v.comparendos,
    v.kmActual ?? '',
    v.pruebaFrenado ?? '',
    v.llantasLabradoMm ?? '',
    v.anomaliaConsumoPct ?? '',
    t(`roadSafety.alerta.vehiculo.${v.alerta}`),
  ])
  downloadCsv(`vehiculos-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
}

function fecha(value: string | null): string {
  return value ? formatDate(value, locale.value as Locale) : '—'
}

// --- Corrección puntual por celda (admin) --------------------------------
// Solo las columnas visibles que son dato crudo (no calculado) tienen
// lápiz — Días SOAT/RTM, Anomalía y Alerta se recalculan al leer, no hay
// nada que corregir ahí (ver roadSafetyFieldSpecs.ts en el backend).
type FieldType = 'string' | 'text' | 'int' | 'float' | 'date'
const correcting = ref<{ vehiculo: RoadSafetyVehiculo; field: string; label: string; type: FieldType } | null>(null)

function openCorrect(vehiculo: RoadSafetyVehiculo, field: string, label: string, type: FieldType) {
  correcting.value = { vehiculo, field, label, type }
}

async function handleCorrectSubmit(value: RoadSafetyFieldValue, reason: string) {
  if (!correcting.value || !props.organizationId) return
  const { vehiculo, field } = correcting.value
  try {
    const updated = await correctRoadSafetyVehiculoField(props.organizationId, vehiculo.id, field, value, reason)
    const index = vehiculos.value.findIndex((v) => v.id === vehiculo.id)
    if (index !== -1) vehiculos.value[index] = updated
    correcting.value = null
  } catch (err) {
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.correct.genericError'))
  }
}
</script>

<template>
  <div class="grid gap-4">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <template v-else>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja2.tipoDistribucionTitle') }}
          </p>
          <ServiceDistributionDonut :slices="tipoDonutSlices" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja2.estadoFlotaTitle') }}
          </p>
          <HorizontalBarChart :items="estadoFlotaItems" :max="vehiculos.length" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja2.rendimientoTitle') }}
          </p>
          <div class="grid gap-2.5">
            <div v-for="r in rendimientoItems" :key="r.placa" class="flex items-center gap-3 text-[13px]">
              <p class="w-[30%] shrink-0 truncate font-mono font-semibold text-navy-900">{{ r.placa }}</p>
              <div class="flex flex-1 flex-col gap-1">
                <div class="h-2.5 overflow-hidden rounded-full bg-line">
                  <div class="h-full rounded-full bg-sky-400" :style="{ width: `${r.pctActual}%` }" />
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-line">
                  <div class="h-full rounded-full bg-navy-700/40" :style="{ width: `${r.pctBase}%` }" />
                </div>
              </div>
              <p class="w-16 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-navy-900">
                {{ r.actual }}/{{ r.base }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-line-strong bg-white p-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.hoja2.vencimientosTitle') }}
        </p>
        <HorizontalBarChart :items="vencimientosItems" :max="vencimientosMax" />
      </div>

      <div class="flex items-center justify-between gap-3">
        <input
          v-model="filtroPlaca"
          type="text"
          :placeholder="t('roadSafety.hoja2.filtroPlaca')"
          class="w-full max-w-xs rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
        />
        <button
          type="button"
          class="shrink-0 rounded-sm border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-cream"
          @click="exportCsv"
        >
          {{ t('roadSafety.hoja2.exportCsv') }}
        </button>
      </div>

      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="overflow-x-auto">
        <table class="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.placa') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.tipo') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.ciudad') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.conductores') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.soatVence') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.diasSoat') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.rtmVence') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.diasRtm') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.comparendos') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.kmActual') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.pruebaFrenado') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.labrado') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.anomalia') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja2.alerta') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in filtrados" :key="v.id" class="border-t border-line">
              <td class="px-3 py-2 font-mono font-semibold text-navy-900">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.placa }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'placa', t('roadSafety.hoja2.placa'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.tipo ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'tipo', t('roadSafety.hoja2.tipo'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.ciudad ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'ciudad', t('roadSafety.hoja2.ciudad'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.conductoresAsignados ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'conductoresAsignados', t('roadSafety.hoja2.conductores'), 'text')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ fecha(v.soatVence) }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'soatVence', t('roadSafety.hoja2.soatVence'), 'date')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.diasSoat ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ fecha(v.rtmVence) }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'rtmVence', t('roadSafety.hoja2.rtmVence'), 'date')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.diasRtm ?? '—' }}</td>
              <td class="px-3 py-2 font-mono tabular-nums text-navy-900">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.comparendos }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'comparendos', t('roadSafety.hoja2.comparendos'), 'int')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 font-mono tabular-nums text-navy-900">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.kmActual ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'kmActual', t('roadSafety.hoja2.kmActual'), 'int')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.pruebaFrenado ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'pruebaFrenado', t('roadSafety.hoja2.pruebaFrenado'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 font-mono tabular-nums text-navy-900">
                <span class="inline-flex items-center gap-1.5">
                  {{ v.llantasLabradoMm ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(v, 'llantasLabradoMm', t('roadSafety.hoja2.labrado'), 'float')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">
                {{ v.anomaliaConsumoPct != null ? `${v.anomaliaConsumoPct}%` : '—' }}
              </td>
              <td class="bg-cream px-3 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="[SEMAPHORE_STYLES[ALERTA_STATUS[v.alerta]].bg, SEMAPHORE_STYLES[ALERTA_STATUS[v.alerta]].text]"
                >
                  {{ t(`roadSafety.alerta.vehiculo.${v.alerta}`) }}
                </span>
              </td>
            </tr>
            <tr v-if="filtrados.length === 0">
              <td colspan="14" class="px-3 py-6 text-center text-sm text-navy-700/50">
                {{ t('roadSafety.hoja2.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

      <RoadSafetyCorrectFieldModal
        v-if="correcting"
        :field-label="correcting.label"
        :field-type="correcting.type"
        :current-value="(correcting.vehiculo as unknown as Record<string, RoadSafetyFieldValue>)[correcting.field]"
        @submit="handleCorrectSubmit"
        @cancel="correcting = null"
      />
    </template>
  </div>
</template>
