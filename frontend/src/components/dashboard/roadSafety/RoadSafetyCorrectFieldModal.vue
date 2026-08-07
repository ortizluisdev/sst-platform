<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import type { RoadSafetyFieldValue } from '@/services/roadSafety.service'

const props = defineProps<{
  fieldLabel: string
  fieldType: 'string' | 'text' | 'int' | 'float' | 'boolean' | 'date'
  currentValue: RoadSafetyFieldValue
}>()

const emit = defineEmits<{ submit: [value: RoadSafetyFieldValue, reason: string]; cancel: [] }>()

const { t } = useI18n()
const MIN_REASON_LENGTH = 10

// Los inputs de fecha/checkbox necesitan su propio v-model tipado — un solo
// `newValue` genérico como string serviría para texto/número, pero
// `<input type="date">`/`type="checkbox"` no aceptan bien un string
// arbitrario ni loguean su propio tipo nativo.
const textValue = ref(typeof props.currentValue === 'string' ? props.currentValue : String(props.currentValue ?? ''))
const dateValue = ref(
  typeof props.currentValue === 'string' && props.fieldType === 'date' ? props.currentValue.slice(0, 10) : '',
)
const boolValue = ref(props.currentValue === true)
const reason = ref('')
const touched = ref(false)

function handleSubmit() {
  touched.value = true
  const trimmedReason = reason.value.trim()
  if (trimmedReason.length < MIN_REASON_LENGTH) return

  let value: RoadSafetyFieldValue
  if (props.fieldType === 'boolean') {
    value = boolValue.value
  } else if (props.fieldType === 'date') {
    if (!dateValue.value) return
    value = dateValue.value
  } else if (props.fieldType === 'int' || props.fieldType === 'float') {
    const parsed = Number(textValue.value)
    if (Number.isNaN(parsed)) return
    value = parsed
  } else {
    value = textValue.value.trim() || null
  }

  emit('submit', value, trimmedReason)
}
</script>

<template>
  <Modal :title="t('roadSafety.correct.title')" @close="emit('cancel')">
    <p class="mt-2 text-sm text-navy-700">
          <span class="font-semibold text-navy-900">{{ fieldLabel }}</span>
        </p>

        <label for="rs-correct-value" class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('roadSafety.correct.newValueLabel') }}
        </label>
        <input
          v-if="fieldType === 'int' || fieldType === 'float'"
          id="rs-correct-value"
          v-model="textValue"
          type="number"
          :step="fieldType === 'float' ? 'any' : '1'"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-sky-400"
        />
        <input
          v-else-if="fieldType === 'date'"
          id="rs-correct-value"
          v-model="dateValue"
          type="date"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-sky-400"
        />
        <label v-else-if="fieldType === 'boolean'" class="flex items-center gap-2 text-sm text-navy-900">
          <input id="rs-correct-value" v-model="boolValue" type="checkbox" class="h-4 w-4 rounded-sm border-line-strong" />
          {{ t('roadSafety.correct.booleanLabel') }}
        </label>
        <textarea
          v-else-if="fieldType === 'text'"
          id="rs-correct-value"
          v-model="textValue"
          rows="3"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-sky-400"
        />
        <input
          v-else
          id="rs-correct-value"
          v-model="textValue"
          type="text"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-sky-400"
        />

        <label for="rs-correct-reason" class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('roadSafety.correct.reasonLabel') }}
        </label>
        <textarea
          id="rs-correct-reason"
          v-model="reason"
          rows="3"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-sky-400"
          :placeholder="t('roadSafety.correct.reasonPlaceholder')"
          :aria-invalid="touched && reason.trim().length < MIN_REASON_LENGTH"
        />
        <p v-if="touched && reason.trim().length < MIN_REASON_LENGTH" class="mt-1.5 text-xs text-red-600">
          {{ t('roadSafety.correct.reasonError') }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
            @click="emit('cancel')"
          >
            {{ t('roadSafety.correct.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream hover:opacity-90"
            @click="handleSubmit"
          >
            {{ t('roadSafety.correct.confirm') }}
          </button>
        </div>
  </Modal>
</template>
