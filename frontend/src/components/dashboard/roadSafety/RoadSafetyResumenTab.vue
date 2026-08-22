<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getRoadSafetyHoja1,
  getRoadSafetyHoja2,
  getRoadSafetyHoja3,
  getRoadSafetyUploadHistory,
  RoadSafetyRequestError,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyHoja1Data, RoadSafetyVehiculo, RoadSafetyConductor } from '@/types/roadSafety'
import SummaryCard from '../SummaryCard.vue'
import HorizontalBarChart from '../HorizontalBarChart.vue'
import { classifyPesvCompliance, buildPesvByFaseCompliance } from '@/utils/roadSafetyCompliance'
import { buildRoadSafetyAlerts, type RoadSafetyAlertItem } from '@/utils/roadSafetyAlerts'
import { inventoryConceptLabel } from '@/utils/inventoryConceptLabel'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')

const hoja1 = ref<RoadSafetyHoja1Data | null>(null)
const vehiculos = ref<RoadSafetyVehiculo[]>([])
const conductores = ref<RoadSafetyConductor[]>([])
const lastUpdated = ref<string | null>(null)

async function load() {
  status.value = 'loading'
  try {
    const scope = { organizationId: props.organizationId }
    const [h1, h2, h3, uploads] = await Promise.all([
      getRoadSafetyHoja1(scope),
      getRoadSafetyHoja2(scope),
      getRoadSafetyHoja3(scope),
      getRoadSafetyUploadHistory(scope),
    ])
    hoja1.value = h1
    vehiculos.value = h2
    conductores.value = h3
    lastUpdated.value = uploads[0]?.createdAt ?? null
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError'))
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

const pesvGlobalPct = computed(() => hoja1.value?.cumplimientoPesvGlobal ?? null)

const vehiculosConAlerta = computed(() => vehiculos.value.filter((v) => v.alerta !== 'OK').length)
const conductoresSinAprobar = computed(() => conductores.value.filter((c) => c.resultado === 'No aprobado').length)
const iccPromedio = computed(() => {
  const conIcc = conductores.value.filter((c) => c.icc != null)
  if (conIcc.length === 0) return null
  return Math.round(conIcc.reduce((sum, c) => sum + (c.icc ?? 0), 0) / conIcc.length)
})

const FASE_LABEL_KEY: Record<string, string> = {
  F1: 'roadSafety.resumen.fase.F1',
  F2: 'roadSafety.resumen.fase.F2',
  F3: 'roadSafety.resumen.fase.F3',
  F4: 'roadSafety.resumen.fase.F4',
}

const pesvPorFaseItems = computed(() => {
  if (!hoja1.value) return []
  return buildPesvByFaseCompliance(hoja1.value.pasos).map((f) => ({
    label: t(FASE_LABEL_KEY[f.fase] ?? f.fase),
    value: f.promedioAvance,
    display: `${f.promedioAvance}%`,
    colorClass: 'bg-sky-400',
  }))
})

const alertas = computed<RoadSafetyAlertItem[]>(() => buildRoadSafetyAlerts(vehiculos.value, conductores.value, t))

const ALERT_STYLE: Record<RoadSafetyAlertItem['severity'], { bg: string; border: string; text: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
}

function inventarioItems(grupo: 'ACTORES_VIALES' | 'PARQUE_AUTOMOTOR') {
  if (!hoja1.value) return []
  return [...hoja1.value.inventario[grupo].items]
    .sort((a, b) => b.cantidad - a.cantidad)
    .map((item) => ({
      label: inventoryConceptLabel(item.concepto, locale.value as Locale),
      value: item.cantidad,
      colorClass: 'bg-sky-400',
    }))
}
const actoresItems = computed(() => inventarioItems('ACTORES_VIALES'))
const parqueItems = computed(() => inventarioItems('PARQUE_AUTOMOTOR'))
const coberturaItems = computed(() => hoja1.value?.inventario.COBERTURA_OPERACIONAL.items ?? [])
</script>

<template>
  <div class="grid gap-6">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <template v-else>
      <p class="text-xs text-navy-700/60">
        {{ t('roadSafety.dashboard.lastUpdatedPrefix') }}
        {{ lastUpdated ? formatDate(lastUpdated, locale as Locale) : t('roadSafety.dashboard.noUploads') }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          :titulo="t('roadSafety.resumen.kpiPesv')"
          :valor="pesvGlobalPct != null ? `${pesvGlobalPct}%` : t('roadSafety.noData')"
          :cumplimiento-pct="pesvGlobalPct ?? 0"
          :estado="classifyPesvCompliance(pesvGlobalPct)"
        />
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.resumen.kpiVehiculosAlerta') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ vehiculosConAlerta }} / {{ vehiculos.length }}</p>
          <span
            class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase"
            :class="vehiculosConAlerta > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
          >
            {{ t(vehiculosConAlerta > 0 ? 'roadSafety.resumen.pillAlerta' : 'roadSafety.resumen.pillOk') }}
          </span>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.resumen.kpiConductoresSinAprobar') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ conductoresSinAprobar }} / {{ conductores.length }}</p>
          <span
            class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase"
            :class="conductoresSinAprobar > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
          >
            {{
              t(conductoresSinAprobar > 0 ? 'roadSafety.resumen.pillNoAprobado' : 'roadSafety.resumen.pillAprobado')
            }}
          </span>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.resumen.kpiIccPromedio') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ iccPromedio ?? t('roadSafety.noData') }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.resumen.pesvPorFaseTitle') }}
          </p>
          <HorizontalBarChart :items="pesvPorFaseItems" :max="100" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.resumen.alertasTitle') }} ({{ alertas.length }})
          </p>
          <div v-if="alertas.length === 0" class="text-xs text-navy-700/60">
            {{ t('roadSafety.resumen.alertasEmpty') }}
          </div>
          <div v-else class="grid gap-2">
            <div
              v-for="(alerta, i) in alertas"
              :key="i"
              class="rounded-md border-l-4 px-3 py-2 text-xs"
              :class="[ALERT_STYLE[alerta.severity].bg, ALERT_STYLE[alerta.severity].border]"
            >
              <p class="font-semibold text-navy-900">{{ alerta.title }}</p>
              <p class="mt-0.5" :class="ALERT_STYLE[alerta.severity].text">{{ alerta.detail }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja1.grupo.ACTORES_VIALES') }}
          </p>
          <HorizontalBarChart :items="actoresItems" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja1.grupo.PARQUE_AUTOMOTOR') }}
          </p>
          <HorizontalBarChart :items="parqueItems" />
        </div>
      </div>

      <div class="rounded-lg border border-line-strong bg-white p-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.hoja1.grupo.COBERTURA_OPERACIONAL') }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="item in coberturaItems" :key="item.concepto">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ inventoryConceptLabel(item.concepto, locale as Locale) }}
            </p>
            <p class="mt-1 text-2xl font-bold text-navy-900">{{ item.cantidad }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
