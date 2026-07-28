<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import CreateOrganizationModal from '@/components/dashboard/organizations/CreateOrganizationModal.vue'
import EditOrganizationModal from '@/components/dashboard/organizations/EditOrganizationModal.vue'
import {
  listOrganizationsFull,
  updateOrganization,
  OrganizationRequestError,
} from '@/services/organizations.service'
import type { OrganizationListItem } from '@/types/organization'

const { t } = useI18n()

useHead(() => ({ title: t('organizations.list.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const organizations = ref<OrganizationListItem[]>([])
const showCreateModal = ref(false)
const editingOrganization = ref<OrganizationListItem | null>(null)

async function load() {
  status.value = 'loading'
  try {
    organizations.value = await listOrganizationsFull()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('organizations.list.loadError')
  }
}

onMounted(load)

async function handleCreated() {
  showCreateModal.value = false
  await load()
}

async function handleEditSubmit(values: { nombre: string; nit: string; contactEmail: string }) {
  if (!editingOrganization.value) return
  try {
    await updateOrganization(editingOrganization.value.id, values)
    editingOrganization.value = null
    await load()
  } catch (err) {
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('organizations.list.actionError')
  }
}
</script>

<template>
  <div>
    <div class="mx-auto max-w-5xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-navy-900">{{ t('organizations.list.pageTitle') }}</h1>
        <button
          type="button"
          class="rounded-sm bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          @click="showCreateModal = true"
        >
          {{ t('organizations.list.newOrganization') }}
        </button>
      </div>

      <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('organizations.list.loading') }}</p>
      <p
        v-else-if="status === 'error'"
        class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="organizations.length === 0" class="mt-6 text-sm text-navy-700/60">
        {{ t('organizations.list.empty') }}
      </p>

      <div v-else class="mt-6 overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
                <th class="px-4 py-3 font-semibold">{{ t('organizations.list.table.nombre') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('organizations.list.table.servicio') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('organizations.list.table.responsable') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('organizations.list.table.estado') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('organizations.list.table.acciones') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="org in organizations" :key="org.id" class="border-t border-line">
                <td class="px-4 py-3">
                  <p class="font-semibold text-navy-900">{{ org.nombre }}</p>
                  <p class="text-xs text-navy-700/60">{{ t('organizations.form.nit') }}: {{ org.nit ?? '—' }}</p>
                </td>
                <td class="px-4 py-3 text-navy-700">
                  <span v-if="org.services.length === 0">—</span>
                  <span v-else>{{ org.services.map((s) => s.nombre).join(', ') }}</span>
                </td>
                <td class="px-4 py-3 text-navy-700">
                  <template v-if="org.responsable">
                    <p class="text-navy-900">{{ org.responsable.nombre }}</p>
                    <p class="text-xs text-navy-700/60">{{ org.responsable.email }}</p>
                    <p class="text-xs text-navy-700/60">
                      {{ t(`organizations.list.responsableStatus.${org.responsable.accountStatus}`) }}
                    </p>
                  </template>
                  <span v-else>—</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase"
                    :class="
                      org.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-line-strong bg-cream text-navy-700/60'
                    "
                  >
                    {{ org.isActive ? t('dashboard.servicesManagement.active') : t('dashboard.servicesManagement.inactive') }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                    @click="editingOrganization = org"
                  >
                    {{ t('dashboard.servicesManagement.edit') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <CreateOrganizationModal v-if="showCreateModal" @created="handleCreated" @cancel="showCreateModal = false" />
    <EditOrganizationModal
      v-if="editingOrganization"
      :organization="editingOrganization"
      @submit="handleEditSubmit"
      @cancel="editingOrganization = null"
    />
  </div>
</template>
