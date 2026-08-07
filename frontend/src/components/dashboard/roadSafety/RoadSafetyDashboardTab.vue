<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getRoadSafetyHoja1,
  getRoadSafetyHoja2,
  getRoadSafetyHoja3,
  getRoadSafetyHoja4,
  getRoadSafetyAlertas,
  getRoadSafetyUploadHistory,
  RoadSafetyRequestError,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyAlertasPanel, RoadSafetyPesvPaso } from '@/types/roadSafety'
import SummaryCard from '../SummaryCard.vue'
import ComplianceRing from '../ComplianceRing.vue'
import { classifyPesvCompliance, buildPesvGlobalCompliance } from '@/utils/roadSafetyCompliance'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')

const cumplimientoPesvGlobal = ref<number | null>(null)
const pesvPasos = ref<RoadSafetyPesvPaso[]>([])
const totalVehiculos = ref(0)
const totalConductores = ref(0)
const totalRutas = ref(0)
const alertas = ref<RoadSafetyAlertasPanel | null>(null)
const lastUpdated = ref<string | null>(null)

const pesvCompliance = computed(() => buildPesvGlobalCompliance(pesvPasos.value))

async function load() {
  status.value = 'loading'
  try {
    const scope = { organizationId: props.organizationId }
    const [hoja1, hoja2, hoja3, hoja4, alertasPanel, uploads] = await Promise.all([
      getRoadSafetyHoja1(scope),
      getRoadSafetyHoja2(scope),
      getRoadSafetyHoja3(scope),
      getRoadSafetyHoja4(scope),
      getRoadSafetyAlertas(scope),
      getRoadSafetyUploadHistory(scope),
    ])
    cumplimientoPesvGlobal.value = hoja1.cumplimientoPesvGlobal
    pesvPasos.value = hoja1.pasos
    totalVehiculos.value = hoja2.length
    totalConductores.value = hoja3.length
    totalRutas.value = hoja4.length
    alertas.value = alertasPanel
    lastUpdated.value = uploads[0]?.createdAt ?? null
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError')
    useToast().error(errorMessage.value)
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })
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
          :titulo="t('roadSafety.dashboard.cumplimientoPesv')"
          :valor="cumplimientoPesvGlobal != null ? `${cumplimientoPesvGlobal}%` : t('roadSafety.noData')"
          :cumplimiento-pct="cumplimientoPesvGlobal ?? 0"
          :estado="classifyPesvCompliance(cumplimientoPesvGlobal)"
        />
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalVehiculos') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalVehiculos }}</p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalConductores') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalConductores }}</p>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.dashboard.totalRutas') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ totalRutas }}</p>
        </div>
      </div>

      <ComplianceRing :compliance="pesvCompliance" />

      <div v-if="alertas">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.dashboard.alertasTitle') }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.vencidos') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-red-700">{{ alertas.vehiculos.vencidos }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.enAlerta') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-amber-700">{{ alertas.vehiculos.enAlerta }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.licenciasVencidas') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-red-700">{{ alertas.conductores.licenciasVencidas }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.enAlertaConductor') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-amber-700">{{ alertas.conductores.enAlerta }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
