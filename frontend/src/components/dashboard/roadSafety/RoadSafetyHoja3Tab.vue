<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoadSafetyHoja3, RoadSafetyRequestError } from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyConductor } from '@/types/roadSafety'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const conductores = ref<RoadSafetyConductor[]>([])

async function load() {
  status.value = 'loading'
  try {
    conductores.value = await getRoadSafetyHoja3({ organizationId: props.organizationId })
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError')
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

const ALERTA_CLASS: Record<string, string> = {
  OK: 'bg-emerald-50 text-emerald-700',
  ALERTA: 'bg-amber-50 text-amber-700',
  LICENCIA_VENCIDA: 'bg-red-50 text-red-700',
}

function fecha(value: string | null): string {
  return value ? formatDate(value, locale.value as Locale) : '—'
}
</script>

<template>
  <div class="grid gap-4">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
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
              <td class="px-3 py-2 font-mono text-xs text-navy-700/70">{{ c.documento }}</td>
              <td class="px-3 py-2 font-semibold text-navy-900">{{ c.nombre }}</td>
              <td class="px-3 py-2 text-navy-700">{{ c.actorVial ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ c.ciudad ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ fecha(c.licenciaVence) }}</td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ c.diasLicencia ?? '—' }}</td>
              <td class="px-3 py-2 text-navy-700">{{ c.estadoSalud ?? '—' }}</td>
              <td class="bg-cream px-3 py-2 font-mono tabular-nums text-navy-900">{{ c.icc ?? '—' }}</td>
              <td class="bg-cream px-3 py-2 text-navy-700">{{ c.resultado ?? '—' }}</td>
              <td class="bg-cream px-3 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="ALERTA_CLASS[c.alerta]"
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
  </div>
</template>
