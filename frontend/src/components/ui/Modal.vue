<!-- frontend/src/components/ui/Modal.vue -->
<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ModalAccentStrip from './ModalAccentStrip.vue'

withDefaults(
  defineProps<{
    title: string
    maxWidth?: 'md' | 'lg' | '2xl'
    scrollable?: boolean
  }>(),
  { maxWidth: 'md', scrollable: false },
)
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const MAX_WIDTH_CLASS: Record<'md' | 'lg' | '2xl', string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div
      class="w-full overflow-hidden rounded-md bg-white shadow-xl"
      :class="[MAX_WIDTH_CLASS[maxWidth], scrollable ? 'flex max-h-[90vh] flex-col' : '']"
    >
      <ModalAccentStrip />
      <div class="p-5" :class="scrollable ? 'overflow-y-auto' : ''">
        <div class="flex items-start justify-between gap-3">
          <slot name="header">
            <h2 class="text-base font-bold text-navy-900">{{ title }}</h2>
          </slot>
          <button
            type="button"
            class="shrink-0 rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('common.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
