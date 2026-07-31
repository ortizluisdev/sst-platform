<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import ServiceFormModal from '@/components/dashboard/services/ServiceFormModal.vue'
import {
  listAllServices,
  createService,
  updateService,
  ServiceCatalogRequestError,
} from '@/services/serviceCatalog.service'
import type { CatalogService } from '@/types/serviceCatalog'
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'

const { t } = useI18n()
const primaryTextClass = useOrgPrimaryTextClass()

useHead(() => ({ title: t('dashboard.servicesManagement.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const services = ref<CatalogService[]>([])
const editingService = ref<CatalogService | null>(null)
const showModal = ref(false)
const togglingId = ref<string | null>(null)

async function load() {
  status.value = 'loading'
  try {
    services.value = await listAllServices()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('dashboard.servicesManagement.loadError')
  }
}

onMounted(load)

function openCreateModal() {
  editingService.value = null
  showModal.value = true
}

function openEditModal(service: CatalogService) {
  editingService.value = service
  showModal.value = true
}

async function handleSubmit(values: { nombre: string; descripcion: string }) {
  try {
    if (editingService.value) {
      await updateService(editingService.value.id, { nombre: values.nombre, descripcion: values.descripcion || null })
    } else {
      await createService({ nombre: values.nombre, descripcion: values.descripcion || undefined })
    }
    showModal.value = false
    await load()
  } catch (err) {
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('dashboard.servicesManagement.actionError')
  }
}

async function handleToggleActive(service: CatalogService) {
  togglingId.value = service.id
  try {
    await updateService(service.id, { isActive: !service.isActive })
    await load()
  } catch (err) {
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('dashboard.servicesManagement.actionError')
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="mx-auto max-w-4xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-navy-900">{{ t('dashboard.servicesManagement.pageTitle') }}</h1>
        <button
          type="button"
          class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
          :class="primaryTextClass.text"
          @click="openCreateModal"
        >
          {{ t('dashboard.servicesManagement.newService') }}
        </button>
      </div>

      <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('dashboard.servicesManagement.loading') }}</p>
      <p
        v-else-if="status === 'error'"
        class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="services.length === 0" class="mt-6 text-sm text-navy-700/60">
        {{ t('dashboard.servicesManagement.empty') }}
      </p>

      <div v-else class="mt-6 overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.servicesManagement.table.nombre') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.servicesManagement.table.descripcion') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.servicesManagement.table.estado') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.servicesManagement.table.acciones') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in services" :key="service.id" class="border-t border-line">
                <td class="px-4 py-3">
                  <p class="font-semibold text-navy-900">{{ service.nombre }}</p>
                  <p class="font-mono text-xs text-navy-700/60">{{ service.slug }}</p>
                </td>
                <td class="max-w-xs px-4 py-3 text-navy-700">
                  <span class="line-clamp-2">{{ service.descripcion || '—' }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase"
                    :class="
                      service.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-line-strong bg-cream text-navy-700/60'
                    "
                  >
                    {{ service.isActive ? t('dashboard.servicesManagement.active') : t('dashboard.servicesManagement.inactive') }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <router-link
                      v-if="service.slug === 'higiene-industrial'"
                      :to="{ name: 'admin-variable-catalog', params: { serviceSlug: service.slug } }"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                    >
                      {{ t('dashboard.servicesManagement.viewCatalog') }}
                    </router-link>
                    <button
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="openEditModal(service)"
                    >
                      {{ t('dashboard.servicesManagement.edit') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-sm border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      :class="
                        service.isActive
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      "
                      :disabled="togglingId === service.id"
                      @click="handleToggleActive(service)"
                    >
                      {{ service.isActive ? t('dashboard.servicesManagement.deactivate') : t('dashboard.servicesManagement.activate') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <ServiceFormModal v-if="showModal" :service="editingService" @submit="handleSubmit" @cancel="showModal = false" />
  </div>
</template>
