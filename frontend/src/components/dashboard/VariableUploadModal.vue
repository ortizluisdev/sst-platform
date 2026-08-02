<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
import VariableUploadForm from '@/components/dashboard/VariableUploadForm.vue'

defineProps<{ organizationId: string; serviceSlug: string }>()
const emit = defineEmits<{ uploaded: []; close: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-2xl overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.uploadForm.heading') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.uploadForm.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <VariableUploadForm
          class="mt-4"
          :organization-id="organizationId"
          :service-slug="serviceSlug"
          @uploaded="
            () => {
              emit('uploaded')
              emit('close')
            }
          "
        />
      </div>
    </div>
  </div>
</template>
