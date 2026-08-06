<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoadSafetyHoja1, RoadSafetyRequestError } from '@/services/roadSafety.service'
import type { RoadSafetyHoja1Data } from '@/types/roadSafety'
import type { Locale } from '@/i18n'
import { pesvStepLabel, nivelAplicableLabel, cumplimientoLabel } from '@/utils/pesvStepLabel'
import { inventoryConceptLabel } from '@/utils/inventoryConceptLabel'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const data = ref<RoadSafetyHoja1Data | null>(null)

async function load() {
  status.value = 'loading'
  try {
    data.value = await getRoadSafetyHoja1({ organizationId: props.organizationId })
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError')
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

const CUMPLIMIENTO_CLASS: Record<string, string> = {
  Cumple: 'bg-emerald-50 text-emerald-700',
  Parcial: 'bg-amber-50 text-amber-700',
  'No cumple': 'bg-red-50 text-red-700',
}

const GRUPOS = ['ACTORES_VIALES', 'PARQUE_AUTOMOTOR', 'COBERTURA_OPERACIONAL'] as const
</script>

<template>
  <div class="grid gap-6">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <template v-else-if="data">
      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line-strong bg-sky-100 px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700">
            {{ t('roadSafety.hoja1.pesvTitle') }}
          </p>
          <p class="text-sm font-bold text-navy-900">
            {{ t('roadSafety.hoja1.cumplimientoGlobal') }}:
            <span v-if="data.cumplimientoPesvGlobal != null">{{ data.cumplimientoPesvGlobal }}%</span>
            <span v-else class="text-navy-700/50">{{ t('roadSafety.noData') }}</span>
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-sky-50 text-left text-[11px] uppercase tracking-wide text-navy-700">
                <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja1.fase') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja1.paso') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja1.elemento') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja1.nivelAplicable') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja1.cumplimiento') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja1.avance') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in data.pasos" :key="p.paso" class="border-t border-line">
                <td class="px-3 py-2 font-mono text-xs text-navy-700/70">{{ p.fase }}</td>
                <td class="px-3 py-2 font-mono text-xs text-navy-700/70">{{ p.paso }}</td>
                <td class="px-3 py-2 text-navy-900">{{ pesvStepLabel(p.paso, p.elemento, locale as Locale) }}</td>
                <td class="px-3 py-2 text-navy-700">{{ nivelAplicableLabel(p.nivelAplicable, locale as Locale) ?? '—' }}</td>
                <td class="px-3 py-2">
                  <span
                    v-if="p.cumplimiento"
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="CUMPLIMIENTO_CLASS[p.cumplimiento] ?? 'bg-cream text-navy-700'"
                  >
                    {{ cumplimientoLabel(p.cumplimiento, locale as Locale) }}
                  </span>
                  <span v-else class="text-navy-700/40">—</span>
                </td>
                <td class="px-3 py-2 font-mono tabular-nums text-navy-900">
                  {{ p.porcentajeAvance != null ? `${p.porcentajeAvance}%` : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-for="grupo in GRUPOS" :key="grupo" class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="flex items-center justify-between border-b border-line-strong bg-sky-100 px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700">
            {{ t(`roadSafety.hoja1.grupo.${grupo}`) }}
          </p>
          <p class="text-sm font-bold text-navy-900">
            {{ t('roadSafety.hoja1.total') }}: {{ data.inventario[grupo].total }}
          </p>
        </div>
        <table class="w-full border-collapse text-sm">
          <tbody>
            <tr v-for="item in data.inventario[grupo].items" :key="item.concepto" class="border-t border-line">
              <td class="px-4 py-2 text-navy-900">{{ inventoryConceptLabel(item.concepto, locale as Locale) }}</td>
              <td class="px-4 py-2 text-right font-mono tabular-nums text-navy-900">{{ item.cantidad }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
