<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'

const props = defineProps<{
  workPointNombre: string
  variableNombre: string
  currentValue: number
  unidadMedida: string
}>()

const emit = defineEmits<{ submit: [valor: number, reason: string]; cancel: [] }>()

const { t } = useI18n()
const primaryTextClass = useOrgPrimaryTextClass()

const newValue = ref(String(props.currentValue))
const reason = ref('')
const touched = ref(false)
const MIN_REASON_LENGTH = 10

function handleSubmit() {
  touched.value = true
  const parsedValue = Number(newValue.value)
  const trimmedReason = reason.value.trim()
  if (Number.isNaN(parsedValue) || trimmedReason.length < MIN_REASON_LENGTH) return
  emit('submit', parsedValue, trimmedReason)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.category.correctModal.title') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.category.correctModal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 grid gap-1 text-sm text-navy-700">
          <p>
            <span class="font-semibold text-navy-900">{{ t('dashboard.category.correctModal.workPointLabel') }}:</span>
            {{ props.workPointNombre }}
          </p>
          <p>
            <span class="font-semibold text-navy-900">{{ t('dashboard.category.correctModal.variableLabel') }}:</span>
            {{ props.variableNombre }}
          </p>
          <p>
            <span class="font-semibold text-navy-900"
              >{{ t('dashboard.category.correctModal.currentValueLabel') }}:</span
            >
            {{ props.currentValue }} {{ props.unidadMedida }}
          </p>
        </div>

        <label
          for="correct-new-value"
          class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700"
        >
          {{ t('dashboard.category.correctModal.newValueLabel') }}
        </label>
        <input
          id="correct-new-value"
          v-model="newValue"
          type="number"
          step="any"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-sky-400"
        />

        <label
          for="correct-reason"
          class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700"
        >
          {{ t('dashboard.category.correctModal.reasonLabel') }}
        </label>
        <textarea
          id="correct-reason"
          v-model="reason"
          rows="3"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-sky-400"
          :placeholder="t('dashboard.category.correctModal.reasonPlaceholder')"
          :aria-invalid="touched && reason.trim().length < MIN_REASON_LENGTH"
          aria-describedby="correct-reason-error"
        />
        <p
          v-if="touched && reason.trim().length < MIN_REASON_LENGTH"
          id="correct-reason-error"
          class="mt-1.5 text-xs text-red-600"
        >
          {{ t('dashboard.category.correctModal.reasonError') }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
            @click="emit('cancel')"
          >
            {{ t('dashboard.category.correctModal.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
            :class="primaryTextClass.text"
            @click="handleSubmit"
          >
            {{ t('dashboard.category.correctModal.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
