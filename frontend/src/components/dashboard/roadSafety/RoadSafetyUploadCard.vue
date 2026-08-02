<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { uploadRoadSafetyWorkbook, RoadSafetyRequestError } from '@/services/roadSafety.service'

const props = defineProps<{ organizationId?: string }>()
const emit = defineEmits<{ uploaded: [] }>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const lastFileName = ref('')

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  status.value = 'loading'
  errorMessage.value = ''
  try {
    const upload = await uploadRoadSafetyWorkbook({ organizationId: props.organizationId }, file)
    lastFileName.value = upload.originalFile
    status.value = 'success'
    emit('uploaded')
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.upload.genericError')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div>
    <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
      {{ t('roadSafety.upload.label') }}
    </label>
    <p class="mb-2 text-xs text-navy-700/60">{{ t('roadSafety.upload.hint') }}</p>
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx"
      class="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
      :disabled="status === 'loading'"
      @change="onFileChange"
    />
    <p v-if="status === 'loading'" class="mt-1.5 text-xs text-navy-700">{{ t('roadSafety.upload.loading') }}</p>
    <p v-else-if="status === 'success'" class="mt-1.5 text-xs text-emerald-700">
      {{ t('roadSafety.upload.success', { file: lastFileName }) }}
    </p>
    <p v-else-if="status === 'error'" class="mt-1.5 text-xs text-red-600">{{ errorMessage }}</p>
  </div>
</template>
