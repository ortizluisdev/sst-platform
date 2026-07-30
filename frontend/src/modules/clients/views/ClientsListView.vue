<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CreateOrganizationModal from '@/components/dashboard/organizations/CreateOrganizationModal.vue'
import EditOrganizationModal from '@/components/dashboard/organizations/EditOrganizationModal.vue'
import SuspendUserModal from '@/components/dashboard/notifications/SuspendUserModal.vue'
import { listOrganizationsFull, updateOrganization, OrganizationRequestError } from '@/services/organizations.service'
import { suspendUser, reactivateUser, resendInvitation, AdminUsersRequestError } from '@/services/adminUsers.service'
import type { OrganizationListItem } from '@/types/organization'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useHead(() => ({ title: t('clients.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

type Tab = 'active' | 'suspended' | 'pending'
const tab = ref<Tab>(
  route.query.tab === 'suspended' ? 'suspended' : route.query.tab === 'pending' ? 'pending' : 'active',
)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const organizations = ref<OrganizationListItem[]>([])
const showCreateModal = ref(false)
const editingOrganization = ref<OrganizationListItem | null>(null)
const suspendTarget = ref<OrganizationListItem | null>(null)
const actioningId = ref<string | null>(null)
const resentIds = ref<Set<string>>(new Set())

const active = computed(() => organizations.value.filter((o) => o.responsable?.accountStatus === 'ACTIVE'))
const suspended = computed(() => organizations.value.filter((o) => o.responsable?.accountStatus === 'SUSPENDED'))
const pending = computed(() => organizations.value.filter((o) => o.responsable?.accountStatus === 'PENDING_ACTIVATION'))

const items = computed(() => {
  if (tab.value === 'active') return active.value
  if (tab.value === 'suspended') return suspended.value
  return pending.value
})

async function load() {
  status.value = 'loading'
  try {
    organizations.value = await listOrganizationsFull()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('clients.loadError')
  }
}

onMounted(load)

function switchTab(next: Tab) {
  tab.value = next
  router.replace({ query: { ...route.query, tab: next } })
}

async function handleCreated() {
  showCreateModal.value = false
  await load()
}

async function handleEditSubmit(values: {
  nombre: string
  nit: string
  contactEmail: string
  logoBase64?: string
  primaryColor: string
  secondaryColor: string
}) {
  if (!editingOrganization.value) return
  try {
    await updateOrganization(editingOrganization.value.id, values)
    editingOrganization.value = null
    await load()
  } catch (err) {
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('clients.actionError')
  }
}

async function handleSuspend(reason: string) {
  const org = suspendTarget.value
  if (!org?.responsable) return
  actioningId.value = org.responsable.id
  try {
    await suspendUser(org.responsable.id, reason)
    suspendTarget.value = null
    await load()
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('clients.actionError')
  } finally {
    actioningId.value = null
  }
}

async function handleReactivate(org: OrganizationListItem) {
  if (!org.responsable) return
  if (!window.confirm(t('dashboard.accountManagement.confirmReactivate', { nombre: org.responsable.nombre }))) return
  actioningId.value = org.responsable.id
  try {
    await reactivateUser(org.responsable.id)
    await load()
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('clients.actionError')
  } finally {
    actioningId.value = null
  }
}

async function handleResendInvitation(org: OrganizationListItem) {
  if (!org.responsable) return
  actioningId.value = org.responsable.id
  try {
    await resendInvitation(org.responsable.id)
    resentIds.value = new Set(resentIds.value).add(org.responsable.id)
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('clients.actionError')
  } finally {
    actioningId.value = null
  }
}

function statusBadgeClass(accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'): string {
  if (accountStatus === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (accountStatus === 'SUSPENDED') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-line-strong bg-cream text-navy-700/60'
}
</script>

<template>
  <div>
    <div class="mx-auto max-w-5xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-navy-900">{{ t('clients.pageTitle') }}</h1>
        <button
          type="button"
          class="rounded-sm bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          @click="showCreateModal = true"
        >
          {{ t('clients.newClient') }}
        </button>
      </div>

      <div class="mt-4 flex gap-1 border-b border-line-strong">
        <button
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === 'active' ? 'border-sky-400 text-navy-900' : 'border-transparent text-navy-700/60 hover:text-navy-900'"
          @click="switchTab('active')"
        >
          {{ t('clients.tabs.active') }} ({{ active.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === 'suspended' ? 'border-sky-400 text-navy-900' : 'border-transparent text-navy-700/60 hover:text-navy-900'"
          @click="switchTab('suspended')"
        >
          {{ t('clients.tabs.suspended') }} ({{ suspended.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === 'pending' ? 'border-sky-400 text-navy-900' : 'border-transparent text-navy-700/60 hover:text-navy-900'"
          @click="switchTab('pending')"
        >
          {{ t('clients.tabs.pending') }} ({{ pending.length }})
        </button>
      </div>

      <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('clients.loading') }}</p>
      <p
        v-else-if="status === 'error'"
        class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="items.length === 0" class="mt-6 text-sm text-navy-700/60">
        {{
          tab === 'active' ? t('clients.emptyActive') : tab === 'suspended' ? t('clients.emptySuspended') : t('clients.emptyPending')
        }}
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
              <tr v-for="org in items" :key="org.id" class="border-t border-line">
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
                    <p v-if="org.responsable.suspendReason" class="mt-1 rounded-sm bg-red-50 px-2 py-1 text-xs text-red-700">
                      {{ t('dashboard.accountManagement.suspendReasonLabel') }}: {{ org.responsable.suspendReason }}
                    </p>
                  </template>
                  <span v-else>—</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="org.responsable"
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase"
                    :class="statusBadgeClass(org.responsable.accountStatus)"
                  >
                    {{ t(`organizations.list.responsableStatus.${org.responsable.accountStatus}`) }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="editingOrganization = org"
                    >
                      {{ t('dashboard.servicesManagement.edit') }}
                    </button>
                    <button
                      v-if="tab === 'active' && org.responsable"
                      type="button"
                      class="rounded-sm border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      :disabled="actioningId === org.responsable.id"
                      @click="suspendTarget = org"
                    >
                      {{ t('dashboard.accountManagement.suspend') }}
                    </button>
                    <button
                      v-else-if="tab === 'suspended' && org.responsable"
                      type="button"
                      class="rounded-sm bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      :disabled="actioningId === org.responsable.id"
                      @click="handleReactivate(org)"
                    >
                      {{ t('dashboard.accountManagement.reactivate') }}
                    </button>
                    <button
                      v-else-if="tab === 'pending' && org.responsable"
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900 disabled:opacity-50"
                      :disabled="actioningId === org.responsable.id || resentIds.has(org.responsable.id)"
                      @click="handleResendInvitation(org)"
                    >
                      {{
                        resentIds.has(org.responsable.id)
                          ? t('dashboard.accountManagement.invitationResent')
                          : t('dashboard.accountManagement.resendInvitation')
                      }}
                    </button>
                  </div>
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
    <SuspendUserModal
      v-if="suspendTarget && suspendTarget.responsable"
      :nombre="suspendTarget.responsable.nombre"
      :email="suspendTarget.responsable.email"
      @confirm="handleSuspend"
      @cancel="suspendTarget = null"
    />
  </div>
</template>
