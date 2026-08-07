<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import CreateOrganizationForm from './CreateOrganizationForm.vue'

const emit = defineEmits<{ created: []; cancel: [] }>()

const { t } = useI18n()
</script>

<template>
  <Modal :title="t('organizations.form.pageTitle')" max-width="2xl" scrollable @close="emit('cancel')">
    <p class="mt-1 text-sm text-navy-700/70">{{ t('organizations.form.pageSubtitle') }}</p>

    <div class="mt-6">
      <CreateOrganizationForm @created="emit('created')" />
    </div>
  </Modal>
</template>
