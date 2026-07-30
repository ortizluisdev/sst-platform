<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { uploadVariablesFile, DashboardRequestError, type UploadResult } from '@/services/dashboard.service'

const props = defineProps<{ organizationId: string; serviceSlug: string }>()
const emit = defineEmits<{ uploaded: [] }>()

const { t } = useI18n()

const file = ref<File | null>(null)
const fechaEvaluacion = ref('')
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')
const lastResult = ref<UploadResult | null>(null)

function onFileChange(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function submit() {
  if (!file.value || !fechaEvaluacion.value) {
    status.value = 'error'
    errorMessage.value = t('dashboard.uploadForm.missingFields')
    return
  }
  status.value = 'loading'
  errorMessage.value = ''
  try {
    lastResult.value = await uploadVariablesFile({
      organizationId: props.organizationId,
      serviceSlug: props.serviceSlug,
      file: file.value,
      fechaEvaluacion: fechaEvaluacion.value,
    })
    status.value = 'idle'
    file.value = null
    emit('uploaded')
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof DashboardRequestError ? err.message : t('dashboard.uploadForm.processError')
  }
}
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-4 sm:p-5">
    <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
      {{ t('dashboard.uploadForm.heading') }}
    </p>
    <p class="mb-4 text-xs text-navy-700 opacity-70">
      {{ t('dashboard.uploadForm.columnsHint') }}
    </p>

    <form class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto] sm:gap-4" @submit.prevent="submit">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        class="w-full min-w-0 rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900 file:mr-3 file:rounded-sm file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy-700"
        @change="onFileChange"
      />
      <input
        v-model="fechaEvaluacion"
        type="date"
        class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
      />
      <SubmitButton :loading="status === 'loading'" :loading-label="t('dashboard.uploadForm.processing')">{{ t('dashboard.uploadForm.submit') }}</SubmitButton>
    </form>

    <p v-if="status === 'error'" class="mt-3 rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <p v-if="lastResult" class="mt-3 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
      {{ t('dashboard.uploadForm.successPrefix') }}{{ lastResult.filasProcesadas }}{{ t('dashboard.uploadForm.successRows') }}{{ lastResult.puestosAfectados }}{{ t('dashboard.uploadForm.successSuffix') }}
    </p>
    <div v-if="lastResult?.filasOmitidas?.length" class="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <p class="font-semibold">{{ t('dashboard.uploadForm.omittedHeading') }}</p>
      <ul class="mt-1 list-disc pl-5">
        <li v-for="(omitida, i) in lastResult.filasOmitidas" :key="i">
          <template v-if="'nombre' in omitida">
            {{ omitida.nombre }} — {{ t(`dashboard.uploadForm.omittedReason.${omitida.motivo}`) }}
          </template>
          <template v-else>
            {{ omitida.workPointCodigo }} / {{ omitida.codigoVariable }} — {{ t('dashboard.uploadForm.omittedReason.ya_corregida') }}
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>
