<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import CatalogSelect from '@/components/dashboard/CatalogSelect.vue'
import { uploadVariablesFile, DashboardRequestError, type UploadResult } from '@/services/dashboard.service'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId: string; serviceSlug: string }>()
const emit = defineEmits<{ uploaded: [] }>()

const { t } = useI18n()

const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const fechaEvaluacion = ref('')
const zonaId = ref('')
const seccionId = ref('')
const cargoId = ref('')
const trabajadorId = ref('')
const exposicionSolar = ref(false)
const status = ref<'idle' | 'loading' | 'error'>('idle')
const lastResult = ref<UploadResult | null>(null)

function onFileChange(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function submit() {
  if (!file.value || !fechaEvaluacion.value || !zonaId.value || !seccionId.value || !cargoId.value || !trabajadorId.value) {
    status.value = 'error'
    useToast().error(t('dashboard.uploadForm.missingFields'))
    return
  }
  status.value = 'loading'
  try {
    lastResult.value = await uploadVariablesFile({
      organizationId: props.organizationId,
      serviceSlug: props.serviceSlug,
      file: file.value,
      fechaEvaluacion: fechaEvaluacion.value,
      zonaId: zonaId.value,
      seccionId: seccionId.value,
      cargoId: cargoId.value,
      trabajadorId: trabajadorId.value,
      exposicionSolar: exposicionSolar.value,
    })
    status.value = 'idle'
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    emit('uploaded')
    useToast().success(
      `${t('dashboard.uploadForm.successPrefix')}${lastResult.value.filasProcesadas}${t('dashboard.uploadForm.successRows')}${lastResult.value.puestosAfectados}${t('dashboard.uploadForm.successSuffix')}`,
    )
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof DashboardRequestError ? err.message : t('dashboard.uploadForm.processError'))
  }
}
</script>

<template>
  <div>
    <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
      {{ t('dashboard.uploadForm.heading') }}
    </p>
    <p class="mb-4 text-xs text-navy-700 opacity-70">
      {{ t('dashboard.uploadForm.columnsHint') }}
    </p>

    <form class="grid grid-cols-1 gap-4" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,.xlsx,.xls"
            class="hidden"
            @change="onFileChange"
          />
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="shrink-0 rounded-sm bg-sky-100 px-3 py-2.5 text-xs font-semibold text-navy-700 hover:bg-sky-200"
              @click="fileInput?.click()"
            >
              {{ t('dashboard.uploadForm.chooseFile') }}
            </button>
            <span class="truncate text-sm text-navy-900">{{ file?.name || t('dashboard.uploadForm.noFile') }}</span>
          </div>
        </div>
        <input
          v-model="fechaEvaluacion"
          type="date"
          class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CatalogSelect
          v-model="zonaId"
          :organization-id="props.organizationId"
          tipo="zona"
          :label="t('dashboard.uploadForm.zonaLabel')"
        />
        <CatalogSelect
          v-model="seccionId"
          :organization-id="props.organizationId"
          tipo="seccion"
          :label="t('dashboard.uploadForm.seccionLabel')"
        />
        <CatalogSelect
          v-model="cargoId"
          :organization-id="props.organizationId"
          tipo="cargo"
          :label="t('dashboard.uploadForm.cargoLabel')"
        />
        <CatalogSelect
          v-model="trabajadorId"
          :organization-id="props.organizationId"
          tipo="trabajador"
          :label="t('dashboard.uploadForm.trabajadorLabel')"
        />
      </div>

      <label class="flex items-center gap-2 text-sm text-navy-900">
        <input v-model="exposicionSolar" type="checkbox" class="h-4 w-4 rounded-sm border-line-strong" />
        {{ t('dashboard.uploadForm.exposicionSolarLabel') }}
      </label>

      <SubmitButton :loading="status === 'loading'" :loading-label="t('dashboard.uploadForm.processing')">{{ t('dashboard.uploadForm.submit') }}</SubmitButton>
    </form>

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
