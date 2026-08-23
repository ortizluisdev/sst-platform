<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import {
  getRoadSafetyHoja3,
  correctRoadSafetyConductorField,
  RoadSafetyRequestError,
  type RoadSafetyFieldValue,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyConductor } from '@/types/roadSafety'
import RoadSafetyCorrectFieldModal from './RoadSafetyCorrectFieldModal.vue'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'
import { useToast } from '@/composables/useToast'
import HorizontalBarChart from '../HorizontalBarChart.vue'
import { downloadCsv } from '@/utils/downloadCsv'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const isAdmin = computed(() => !!props.organizationId)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const conductores = ref<RoadSafetyConductor[]>([])

async function load() {
  status.value = 'loading'
  try {
    conductores.value = await getRoadSafetyHoja3({ organizationId: props.organizationId })
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError'))
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

/** DriverAlertState → CategoryCardStatus — mismo criterio que
 * RoadSafetyHoja2Tab.vue (ver ese archivo para el porqué). */
const ALERTA_STATUS: Record<RoadSafetyConductor['alerta'], CategoryCardStatus> = {
  OK: 'VERDE',
  ALERTA: 'AMARILLO',
  LICENCIA_VENCIDA: 'ROJO',
}

const iccItems = computed(() =>
  [...conductores.value]
    .filter((c) => c.icc != null)
    .sort((a, b) => (b.icc ?? 0) - (a.icc ?? 0))
    .map((c) => ({
      label: c.nombre,
      value: c.icc!,
      display: `${c.icc}`,
      colorClass: c.icc! >= 70 ? 'bg-emerald-500' : 'bg-red-400',
    })),
)

const COMPETENCIA_FIELDS = [
  { field: 'scoreConduccionSegura', labelKey: 'roadSafety.hoja3.competencia.conduccionSegura' },
  { field: 'scoreManejoDefensivo', labelKey: 'roadSafety.hoja3.competencia.manejoDefensivo' },
  { field: 'scoreManejoComentadoDiurno', labelKey: 'roadSafety.hoja3.competencia.manejoComentadoDiurno' },
  { field: 'scoreManejoComentadoNocturno', labelKey: 'roadSafety.hoja3.competencia.manejoComentadoNocturno' },
  { field: 'scoreConocimientoVehiculo', labelKey: 'roadSafety.hoja3.competencia.conocimientoVehiculo' },
  { field: 'scoreNormasTransito', labelKey: 'roadSafety.hoja3.competencia.normasTransito' },
  { field: 'scoreGestionFatiga', labelKey: 'roadSafety.hoja3.competencia.gestionFatiga' },
  { field: 'scoreInvestigacionSiniestros', labelKey: 'roadSafety.hoja3.competencia.investigacionSiniestros' },
  { field: 'scorePrimerosAuxilios', labelKey: 'roadSafety.hoja3.competencia.primerosAuxilios' },
] as const

const competenciasItems = computed(() => {
  const items = COMPETENCIA_FIELDS.map(({ field, labelKey }) => {
    const valores = conductores.value.map((c) => c[field]).filter((v): v is number => v != null)
    const promedio = valores.length > 0 ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0
    return { label: t(labelKey), value: promedio, display: `${promedio}`, colorClass: 'bg-sky-400' }
  })
  return items.sort((a, b) => b.value - a.value)
})

function exportCsv() {
  const headers = [
    t('roadSafety.hoja3.documento'),
    t('roadSafety.hoja3.nombre'),
    t('roadSafety.hoja3.actorVial'),
    t('roadSafety.hoja3.ciudad'),
    t('roadSafety.hoja3.licenciaVence'),
    t('roadSafety.hoja3.diasLicencia'),
    t('roadSafety.hoja3.estadoSalud'),
    t('roadSafety.hoja3.icc'),
    t('roadSafety.hoja3.resultado'),
    t('roadSafety.hoja3.alerta'),
  ]
  const rows = conductores.value.map((c) => [
    c.documento,
    c.nombre,
    c.actorVial ?? '',
    c.ciudad ?? '',
    c.licenciaVence ?? '',
    c.diasLicencia ?? '',
    c.estadoSalud ?? '',
    c.icc ?? '',
    c.resultado ?? '',
    t(`roadSafety.alerta.conductor.${c.alerta}`),
  ])
  downloadCsv(`conductores-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
}

function fecha(value: string | null): string {
  return value ? formatDate(value, locale.value as Locale) : '—'
}

// --- Corrección puntual por celda (admin) — ver mismo bloque en
// RoadSafetyHoja2Tab.vue. ICC/Resultado/Días licencia/Alerta se calculan al
// leer, no tienen lápiz.
type FieldType = 'string' | 'text' | 'int' | 'float' | 'date'
const correcting = ref<{ conductor: RoadSafetyConductor; field: string; label: string; type: FieldType } | null>(null)

function openCorrect(conductor: RoadSafetyConductor, field: string, label: string, type: FieldType) {
  correcting.value = { conductor, field, label, type }
}

async function handleCorrectSubmit(value: RoadSafetyFieldValue, reason: string) {
  if (!correcting.value || !props.organizationId) return
  const { conductor, field } = correcting.value
  try {
    const updated = await correctRoadSafetyConductorField(props.organizationId, conductor.id, field, value, reason)
    const index = conductores.value.findIndex((c) => c.id === conductor.id)
    if (index !== -1) conductores.value[index] = updated
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
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja3.iccTitle') }}
          </p>
          <HorizontalBarChart :items="iccItems" :max="100" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja3.competenciasTitle') }}
          </p>
          <HorizontalBarChart :items="competenciasItems" :max="100" />
        </div>
      </div>

      <div class="flex items-center justify-end">
        <button
          type="button"
          class="rounded-sm border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-cream"
          @click="exportCsv"
        >
          {{ t('roadSafety.hoja3.exportCsv') }}
        </button>
      </div>

      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.documento') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.nombre') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.actorVial') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.ciudad') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.licenciaVence') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.diasLicencia') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.estadoSalud') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.icc') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.resultado') }}</th>
              <th class="bg-line/40 px-3 py-2 font-semibold">{{ t('roadSafety.hoja3.alerta') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in conductores" :key="c.id" class="border-t border-line">
              <td class="px-3 py-2 font-mono text-xs text-navy-700/70">
                <span class="inline-flex items-center gap-1.5">
                  {{ c.documento }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(c, 'documento', t('roadSafety.hoja3.documento'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 font-semibold text-navy-900">
                <span class="inline-flex items-center gap-1.5">
                  {{ c.nombre }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(c, 'nombre', t('roadSafety.hoja3.nombre'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ c.actorVial ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(c, 'actorVial', t('roadSafety.hoja3.actorVial'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ c.ciudad ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(c, 'ciudad', t('roadSafety.hoja3.ciudad'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ fecha(c.licenciaVence) }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(c, 'licenciaVence', t('roadSafety.hoja3.licenciaVence'), 'date')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ c.diasLicencia ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">
                <span class="inline-flex items-center gap-1.5">
                  {{ c.estadoSalud ?? '—' }}
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-sm p-0.5 text-navy-700/40 hover:bg-sky-100 hover:text-navy-700"
                    :aria-label="t('roadSafety.correct.editLabel')"
                    @click="openCorrect(c, 'estadoSalud', t('roadSafety.hoja3.estadoSalud'), 'string')"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                </span>
              </td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ c.icc ?? '—' }}</td>
              <td class="bg-cream px-3 py-2 text-navy-700">{{ c.resultado ?? '—' }}</td>
              <td class="bg-cream px-3 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="[SEMAPHORE_STYLES[ALERTA_STATUS[c.alerta]].bg, SEMAPHORE_STYLES[ALERTA_STATUS[c.alerta]].text]"
                >
                  {{ t(`roadSafety.alerta.conductor.${c.alerta}`) }}
                </span>
              </td>
            </tr>
            <tr v-if="conductores.length === 0">
              <td colspan="10" class="px-3 py-6 text-center text-sm text-navy-700/50">
                {{ t('roadSafety.hoja3.empty') }}
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
        :current-value="(correcting.conductor as unknown as Record<string, RoadSafetyFieldValue>)[correcting.field]"
        @submit="handleCorrectSubmit"
        @cancel="correcting = null"
      />
    </template>
  </div>
</template>
