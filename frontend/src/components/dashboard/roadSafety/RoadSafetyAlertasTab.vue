<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoadSafetyAlertas, RoadSafetyRequestError } from '@/services/roadSafety.service'
import type { RoadSafetyAlertasPanel } from '@/types/roadSafety'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId?: string }>()
const { t } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const data = ref<RoadSafetyAlertasPanel | null>(null)

async function load() {
  status.value = 'loading'
  try {
    data.value = await getRoadSafetyAlertas({ organizationId: props.organizationId })
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
    <template v-else-if="data">
      <div>
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.alertas.vehiculos') }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.vencidos') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-red-700">{{ data.vehiculos.vencidos }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.enAlerta') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-amber-700">{{ data.vehiculos.enAlerta }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.soatRtmPorVencer') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-navy-900">{{ data.vehiculos.soatRtmPorVencer }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.conComparendos') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-navy-900">{{ data.vehiculos.conComparendos }}</p>
          </div>
        </div>
      </div>

      <div>
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.alertas.conductores') }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.licenciasVencidas') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-red-700">{{ data.conductores.licenciasVencidas }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.licenciasPorVencer') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-amber-700">{{ data.conductores.licenciasPorVencer }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.noAprobados') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-navy-900">{{ data.conductores.noAprobados }}</p>
          </div>
          <div class="rounded-lg border border-line-strong bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ t('roadSafety.alertas.enAlertaConductor') }}
            </p>
            <p class="mt-1 text-2xl font-bold text-navy-900">{{ data.conductores.enAlerta }}</p>
          </div>
        </div>
      </div>

      <p class="rounded-sm border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-navy-700">
        {{ t('roadSafety.alertas.hint') }}
      </p>
    </template>
  </div>
</template>
