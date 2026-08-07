<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoadSafetyUploadHistory, RoadSafetyRequestError } from '@/services/roadSafety.service'
import { formatDateTime } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyUploadRecord } from '@/types/roadSafety'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const uploads = ref<RoadSafetyUploadRecord[]>([])

async function load() {
  status.value = 'loading'
  try {
    uploads.value = await getRoadSafetyUploadHistory({ organizationId: props.organizationId })
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.historial.loadError')
    useToast().error(errorMessage.value)
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })
</script>

<template>
  <div class="grid gap-4">
    <p class="text-sm text-navy-700 opacity-70">{{ t('roadSafety.historial.subtitle') }}</p>

    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.historial.loading') }}</p>
    <p
      v-else-if="uploads.length === 0"
      class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700"
    >
      {{ t('roadSafety.historial.empty') }}
    </p>
    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.fecha') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.archivo') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.cargadoPor') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.pesvPasos') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.inventario') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.vehiculos') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.conductores') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('roadSafety.historial.rutaPuntos') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in uploads" :key="u.id" class="border-t border-line">
              <td class="px-4 py-3 text-navy-900">{{ formatDateTime(u.createdAt, locale as Locale) }}</td>
              <td class="px-4 py-3 text-navy-700">{{ u.originalFile }}</td>
              <td class="px-4 py-3 text-navy-700">{{ u.uploadedByNombre }}</td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">{{ u.counts.pesvPasos }}</td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">{{ u.counts.inventario }}</td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">{{ u.counts.vehiculos }}</td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">{{ u.counts.conductores }}</td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">{{ u.counts.rutaPuntos }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
