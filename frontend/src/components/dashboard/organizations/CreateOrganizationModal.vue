<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
import CreateOrganizationForm from './CreateOrganizationForm.vue'

const emit = defineEmits<{ created: []; cancel: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('organizations.form.pageTitle') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.servicesManagement.modal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('organizations.form.pageSubtitle') }}</p>

        <div class="mt-6">
          <CreateOrganizationForm @created="emit('created')" />
        </div>
      </div>
    </div>
  </div>
</template>
