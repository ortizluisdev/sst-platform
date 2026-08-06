<script setup lang="ts">
import { CheckCircle2, AlertCircle, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { ToastItem } from '@/composables/useToast'

defineProps<{ toast: ToastItem }>()
const emit = defineEmits<{ dismiss: [] }>()
const { t } = useI18n()
</script>

<template>
  <div
    class="pointer-events-auto flex w-80 items-start gap-2.5 rounded-md border-l-4 bg-white p-3 shadow-lg"
    :class="toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'"
    :role="toast.type === 'success' ? 'status' : 'alert'"
  >
    <CheckCircle2 v-if="toast.type === 'success'" class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
    <AlertCircle v-else class="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
    <p class="flex-1 text-sm text-navy-900">{{ toast.message }}</p>
    <button
      type="button"
      class="shrink-0 rounded-sm p-0.5 text-navy-700/50 hover:bg-cream"
      :aria-label="t('common.toastDismiss')"
      @click="emit('dismiss')"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>
