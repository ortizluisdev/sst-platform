<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'

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
  <Modal :title="t('dashboard.accountManagement.suspendModal.title')" @close="emit('cancel')">
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
  </Modal>
</template>
