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

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const isAdmin = computed(() => !!props.organizationId)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const vehiculos = ref<RoadSafetyVehiculo[]>([])
const filtroPlaca = ref('')

async function load() {
  status.value = 'loading'
  try {
    vehiculos.value = await getRoadSafetyHoja2({ organizationId: props.organizationId })
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

function fecha(value: string | null): string {
  return value ? formatDate(value, locale.value as Locale) : '—'
}

// --- Corrección puntual por celda (admin) --------------------------------
// Solo las columnas visibles que son dato crudo (no calculado) tienen
// lápiz — Días SOAT/RTM, Anomalía y Alerta se recalculan al leer, no hay
// nada que corregir ahí (ver roadSafetyFieldSpecs.ts en el backend).
type FieldType = 'string' | 'text' | 'int' | 'float' | 'date'
const correcting = ref<{ vehiculo: RoadSafetyVehiculo; field: string; label: string; type: FieldType } | null>(null)

const correctError = ref('')

function openCorrect(vehiculo: RoadSafetyVehiculo, field: string, label: string, type: FieldType) {
  correctError.value = ''
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
    correctError.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.correct.genericError')
    useToast().error(correctError.value)
  }
}
</script>

<template>
  <div class="grid gap-4">
    <input
      v-model="filtroPlaca"
      type="text"
      :placeholder="t('roadSafety.hoja2.filtroPlaca')"
      class="w-full max-w-xs rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
    />

    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
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
  </div>
</template>
