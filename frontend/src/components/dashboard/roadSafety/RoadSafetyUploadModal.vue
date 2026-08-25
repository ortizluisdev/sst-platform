<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { uploadRoadSafetyWorkbook, RoadSafetyRequestError } from '@/services/roadSafety.service'

const props = defineProps<{ organizationId?: string }>()
const emit = defineEmits<{ uploaded: []; close: [] }>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const selectedFileName = ref('')

// Mismo comportamiento que ya tenía RoadSafetyUploadCard.vue (ahora
// reemplazada por este modal, ver RoadSafetyAdminPanel.vue) — un solo
// archivo .xlsx, sin campos adicionales: a diferencia de Higiene Industrial
// (que sí necesita zona/sección/cargo/trabajador porque cada carga es UN
// puesto de trabajo), acá el libro completo ya trae esa granularidad por
// fila (zona/ciudad/sede de cada vehículo o conductor) — agregar esos
// selects acá no aplicaría a este modelo de datos.
async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  selectedFileName.value = file.name

  status.value = 'loading'
  errorMessage.value = ''
  try {
    await uploadRoadSafetyWorkbook({ organizationId: props.organizationId }, file)
    status.value = 'success'
    emit('uploaded')
    emit('close')
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.upload.genericError')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <Modal :title="t('roadSafety.upload.label')" max-width="lg" @close="emit('close')">
    <p class="mb-4 text-sm text-navy-700/70">{{ t('roadSafety.upload.hint') }}</p>

    <input
      ref="fileInput"
      type="file"
      accept=".xlsx"
      class="hidden"
      :disabled="status === 'loading'"
      @change="onFileChange"
    />
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-sm border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-cream disabled:opacity-50"
        :disabled="status === 'loading'"
        @click="fileInput?.click()"
      >
        {{ t('roadSafety.upload.chooseButton') }}
      </button>
      <span class="truncate text-sm text-navy-700/70">{{ selectedFileName || t('roadSafety.upload.noFile') }}</span>
    </div>
    <p v-if="status === 'loading'" class="mt-2 text-xs text-navy-700">{{ t('roadSafety.upload.loading') }}</p>
    <p v-else-if="status === 'error'" class="mt-2 text-xs text-red-600">{{ errorMessage }}</p>
  </Modal>
</template>
