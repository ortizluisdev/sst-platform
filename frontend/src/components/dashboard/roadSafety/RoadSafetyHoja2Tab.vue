<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoadSafetyHoja2, RoadSafetyRequestError } from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyVehiculo } from '@/types/roadSafety'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

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
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

const filtrados = computed(() =>
  vehiculos.value.filter((v) => v.placa.toLowerCase().includes(filtroPlaca.value.trim().toLowerCase())),
)

const ALERTA_CLASS: Record<string, string> = {
  OK: 'bg-emerald-50 text-emerald-700',
  ALERTA: 'bg-amber-50 text-amber-700',
  VENCIDO: 'bg-red-50 text-red-700',
}

function fecha(value: string | null): string {
  return value ? formatDate(value, locale.value as Locale) : '—'
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
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
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
              <td class="px-3 py-2 font-mono font-semibold text-navy-900">{{ v.placa }}</td>
              <td class="px-3 py-2 text-navy-700">{{ v.tipo ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ v.ciudad ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ v.conductoresAsignados ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ fecha(v.soatVence) }}</td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.diasSoat ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ fecha(v.rtmVence) }}</td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.diasRtm ?? '—' }}</td>
              <td class="px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.comparendos }}</td>
              <td class="px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.kmActual ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ v.pruebaFrenado ?? '—' }}</td>
              <td class="px-3 py-2 font-mono tabular-nums text-navy-900">{{ v.llantasLabradoMm ?? '—' }}</td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">
                {{ v.anomaliaConsumoPct != null ? `${v.anomaliaConsumoPct}%` : '—' }}
              </td>
              <td class="bg-cream px-3 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="ALERTA_CLASS[v.alerta]"
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
  </div>
</template>
