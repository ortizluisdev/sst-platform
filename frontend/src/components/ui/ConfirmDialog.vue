<!-- frontend/src/components/ui/ConfirmDialog.vue -->
<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ModalAccentStrip from './ModalAccentStrip.vue'
import { useConfirm } from '@/composables/useConfirm'

const { pending, resolveConfirm, resolveCancel } = useConfirm()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="pending"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/50 px-4"
    @click.self="resolveCancel"
  >
    <div class="w-full max-w-sm overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5" role="alertdialog" aria-modal="true" :aria-label="pending.title">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle class="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ pending.title }}</h2>
            <p class="mt-1 text-sm text-navy-700">{{ pending.message }}</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-3.5 py-2 text-sm font-semibold text-navy-700 hover:bg-cream"
            data-testid="confirm-cancel"
            @click="resolveCancel"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-sm bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
            data-testid="confirm-accept"
            @click="resolveConfirm"
          >
            {{ pending.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
