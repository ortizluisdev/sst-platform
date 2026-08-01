<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'

const props = defineProps<{ nombre: string; email: string }>()
const emit = defineEmits<{ confirm: [reason: string]; cancel: [] }>()

const { t } = useI18n()

const reason = ref('')
const touched = ref(false)
const MIN_LENGTH = 5
const MAX_LENGTH = 1000

function handleConfirm() {
  touched.value = true
  const trimmed = reason.value.trim()
  if (trimmed.length < MIN_LENGTH) return
  emit('confirm', trimmed)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.accountManagement.suspendModal.title') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.accountManagement.suspendModal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-2 text-sm text-navy-700">
          {{ t('dashboard.accountManagement.suspendModal.description', { nombre: props.nombre, email: props.email }) }}
        </p>

        <label
          for="suspend-reason"
          class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700"
        >
          {{ t('dashboard.accountManagement.suspendModal.reasonLabel') }}
        </label>
        <textarea
          id="suspend-reason"
          v-model="reason"
          rows="4"
          :maxlength="MAX_LENGTH"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-700/40 focus:border-sky-400"
          :placeholder="t('dashboard.accountManagement.suspendModal.reasonPlaceholder')"
          :aria-invalid="touched && reason.trim().length < MIN_LENGTH"
          aria-describedby="suspend-reason-error"
        />
        <p
          v-if="touched && reason.trim().length < MIN_LENGTH"
          id="suspend-reason-error"
          class="mt-1.5 text-xs text-red-600"
        >
          {{ t('dashboard.accountManagement.suspendModal.reasonError') }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
            @click="emit('cancel')"
          >
            {{ t('dashboard.accountManagement.suspendModal.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            @click="handleConfirm"
          >
            {{ t('dashboard.accountManagement.suspendModal.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
