<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import BrandingFields from './BrandingFields.vue'
import { useToast } from '@/composables/useToast'
import {
  getOrganizationBranding,
  updateOrganizationBranding,
  AdminBrandingRequestError,
  AdminBrandingValidationError,
} from '@/services/organizationAdminBranding.service'

const props = defineProps<{ organizationId: string; organizationNombre: string }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const { t } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const saving = ref(false)
const logoBase64 = ref('')
const primaryColor = ref('#0b1a33')
const secondaryColor = ref('#5b8dc7')
const errors = ref<Record<string, string>>({})

async function load() {
  status.value = 'loading'
  try {
    const current = await getOrganizationBranding(props.organizationId)
    logoBase64.value = current.logoBase64 ?? ''
    primaryColor.value = current.primaryColor ?? '#0b1a33'
    secondaryColor.value = current.secondaryColor ?? '#5b8dc7'
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof AdminBrandingRequestError ? err.message : t('clients.brandingConfig.loadError'))
  }
}

onMounted(load)

async function handleSave() {
  errors.value = {}
  saving.value = true
  try {
    await updateOrganizationBranding(props.organizationId, {
      logoBase64: logoBase64.value,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
    })
    useToast().success(t('clients.brandingConfig.saveSuccess'))
    emit('saved')
  } catch (err) {
    if (err instanceof AdminBrandingValidationError) {
      errors.value = err.fieldErrors
      useToast().error(Object.values(err.fieldErrors)[0] ?? t('clients.brandingConfig.actionError'))
    } else {
      useToast().error(err instanceof AdminBrandingRequestError ? err.message : t('clients.brandingConfig.actionError'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal title="" max-width="lg" scrollable @close="emit('cancel')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('clients.brandingConfig.title') }}</h2>
        <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
      </div>
    </template>

    <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.brandingConfig.hint') }}</p>

    <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
    <BrandingFields
      v-else-if="status === 'ready'"
      class="mt-4"
      v-model:logo-base64="logoBase64"
      v-model:primary-color="primaryColor"
      v-model:secondary-color="secondaryColor"
    />
    <p v-if="errors.logoBase64" class="mt-1.5 text-xs text-red-600">{{ errors.logoBase64 }}</p>

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
        @click="emit('cancel')"
      >
        {{ t('dashboard.servicesManagement.modal.cancel') }}
      </button>
      <button
        type="button"
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        :disabled="status !== 'ready' || saving"
        @click="handleSave"
      >
        {{ t('dashboard.servicesManagement.modal.save') }}
      </button>
    </div>
  </Modal>
</template>
