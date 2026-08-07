<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { listAllServices, updateService, ServiceCatalogRequestError } from '@/services/serviceCatalog.service'
import type { CatalogService } from '@/types/serviceCatalog'
import { useToast } from '@/composables/useToast'

const SERVICE_SLUG = 'seguridad-vial'

const { t } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const service = ref<CatalogService | null>(null)
const saving = ref(false)

async function load() {
  status.value = 'loading'
  try {
    const services = await listAllServices()
    service.value = services.find((s) => s.slug === SERVICE_SLUG) ?? null
    status.value = service.value ? 'ready' : 'error'
    if (!service.value) {
      errorMessage.value = t('roadSafety.config.loadError')
      useToast().error(errorMessage.value)
    }
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('roadSafety.config.loadError')
    useToast().error(errorMessage.value)
  }
}

onMounted(load)

async function changeFrequency(frequency: 'WEEKLY' | 'BIWEEKLY') {
  if (!service.value || service.value.updateFrequency === frequency) return
  const previous = service.value.updateFrequency
  service.value.updateFrequency = frequency
  saving.value = true
  errorMessage.value = ''
  try {
    await updateService(service.value.id, { updateFrequency: frequency })
  } catch (err) {
    service.value.updateFrequency = previous
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('roadSafety.config.actionError')
    useToast().error(errorMessage.value)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <p class="text-sm text-navy-700 opacity-70">{{ t('roadSafety.config.subtitle') }}</p>

    <section>
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('roadSafety.config.frequency.title') }}
      </p>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('roadSafety.config.frequency.hint') }}</p>

      <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
      <div v-else-if="service" class="grid max-w-sm gap-2">
        <label
          class="flex items-center justify-between gap-3 rounded-sm border border-line-strong bg-white px-3 py-2.5"
        >
          <span class="text-sm font-medium text-navy-900">{{ t('roadSafety.config.frequency.weekly') }}</span>
          <input
            type="radio"
            name="road-safety-frequency"
            class="h-4 w-4"
            :checked="service.updateFrequency === 'WEEKLY'"
            :disabled="saving"
            @change="changeFrequency('WEEKLY')"
          />
        </label>
        <label
          class="flex items-center justify-between gap-3 rounded-sm border border-line-strong bg-white px-3 py-2.5"
        >
          <span class="text-sm font-medium text-navy-900">{{ t('roadSafety.config.frequency.biweekly') }}</span>
          <input
            type="radio"
            name="road-safety-frequency"
            class="h-4 w-4"
            :checked="service.updateFrequency === 'BIWEEKLY'"
            :disabled="saving"
            @change="changeFrequency('BIWEEKLY')"
          />
        </label>
      </div>
    </section>
  </div>
</template>
