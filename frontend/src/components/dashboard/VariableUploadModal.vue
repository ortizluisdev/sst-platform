<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import VariableUploadForm from '@/components/dashboard/VariableUploadForm.vue'

defineProps<{ organizationId: string; serviceSlug: string }>()
const emit = defineEmits<{ uploaded: []; close: [] }>()

const { t } = useI18n()
</script>

<template>
  <Modal :title="t('dashboard.uploadForm.heading')" max-width="2xl" @close="emit('close')">
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
  </Modal>
</template>
