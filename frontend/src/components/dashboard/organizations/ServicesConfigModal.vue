<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import {
  listServices,
  updateOrganizationServices,
  OrganizationRequestError,
  OrganizationValidationError,
} from '@/services/organizations.service'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { ServiceOption } from '@/types/organization'
import type { Locale } from '@/i18n'

const props = defineProps<{
  organizationId: string
  organizationNombre: string
  currentServiceSlugs: string[]
}>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const saving = ref(false)
const services = ref<ServiceOption[]>([])
const selectedSlugs = ref<string[]>([...props.currentServiceSlugs])
const validationError = ref('')

async function load() {
  status.value = 'loading'
  try {
    services.value = await listServices()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof OrganizationRequestError ? err.message : t('clients.servicesConfig.loadError'))
  }
}

onMounted(load)

function toggle(slug: string, checked: boolean) {
  if (checked) {
    if (!selectedSlugs.value.includes(slug)) selectedSlugs.value = [...selectedSlugs.value, slug]
  } else {
    selectedSlugs.value = selectedSlugs.value.filter((s) => s !== slug)
  }
}

async function handleSave() {
  validationError.value = ''
  if (selectedSlugs.value.length === 0) {
    validationError.value = t('clients.servicesConfig.minOneRequired')
    return
  }
  saving.value = true
  try {
    await updateOrganizationServices(props.organizationId, selectedSlugs.value)
    useToast().success(t('clients.servicesConfig.saveSuccess'))
    emit('saved')
  } catch (err) {
    if (err instanceof OrganizationValidationError && 'serviceSlugs' in err.fieldErrors) {
      useToast().error(t('clients.servicesConfig.minOneRequired'))
    } else if (err instanceof OrganizationRequestError) {
      useToast().error(err.message)
    } else {
      useToast().error(t('clients.servicesConfig.actionError'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal title="" scrollable @close="emit('cancel')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('clients.servicesConfig.title') }}</h2>
        <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
      </div>
    </template>

    <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.servicesConfig.hint') }}</p>

    <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
    <div v-else-if="status === 'ready'" class="mt-4 grid gap-2 sm:grid-cols-2">
      <label
        v-for="service in services"
        :key="service.slug"
        class="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors"
        :class="
          selectedSlugs.includes(service.slug)
            ? 'border-sky-400 bg-sky-50 text-navy-900'
            : 'border-line-strong bg-white text-navy-900 hover:bg-cream'
        "
      >
        <input
          type="checkbox"
          :value="service.slug"
          :checked="selectedSlugs.includes(service.slug)"
          class="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-line-strong"
          @change="toggle(service.slug, ($event.target as HTMLInputElement).checked)"
        />
        <component :is="iconForService(service.slug)" class="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
        <span class="min-w-0">{{ serviceLabel(service.slug, service.nombre, locale as Locale) }}</span>
      </label>
    </div>
    <p v-if="validationError" class="mt-1.5 text-xs text-red-600">{{ validationError }}</p>

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
