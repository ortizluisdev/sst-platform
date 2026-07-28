<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SuspendUserModal from '@/components/dashboard/notifications/SuspendUserModal.vue'
import {
  listActiveUsers,
  listSuspendedUsers,
  listPendingActivationUsers,
  reactivateUser,
  suspendUser,
  resendInvitation,
  AdminUsersRequestError,
  type ManagedUser,
} from '@/services/adminUsers.service'
import { formatDateTime } from '@/utils/formatDate'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

useHead(() => ({ title: t('dashboard.accountManagement.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

type Tab = 'active' | 'suspended' | 'pending'
const tab = ref<Tab>(
  route.query.tab === 'suspended' ? 'suspended' : route.query.tab === 'pending' ? 'pending' : 'active',
)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const active = ref<ManagedUser[]>([])
const suspended = ref<ManagedUser[]>([])
const pending = ref<ManagedUser[]>([])
const actioningId = ref<string | null>(null)
const suspendTarget = ref<ManagedUser | null>(null)
const resentIds = ref<Set<string>>(new Set())

const items = computed(() => {
  if (tab.value === 'active') return active.value
  if (tab.value === 'suspended') return suspended.value
  return pending.value
})

async function load() {
  status.value = 'loading'
  try {
    const [a, s, p] = await Promise.all([listActiveUsers(), listSuspendedUsers(), listPendingActivationUsers()])
    active.value = a
    suspended.value = s
    pending.value = p
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('dashboard.accountManagement.loadError')
  }
}

onMounted(load)

function switchTab(next: Tab) {
  tab.value = next
  router.replace({ query: { ...route.query, tab: next } })
}

async function handleSuspend(reason: string) {
  const user = suspendTarget.value
  if (!user) return
  actioningId.value = user.id
  try {
    await suspendUser(user.id, reason)
    active.value = active.value.filter((u) => u.id !== user.id)
    await load()
    suspendTarget.value = null
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('dashboard.accountManagement.actionError')
  } finally {
    actioningId.value = null
  }
}

async function handleReactivate(user: ManagedUser) {
  if (!window.confirm(t('dashboard.accountManagement.confirmReactivate', { nombre: user.nombre }))) return
  actioningId.value = user.id
  try {
    await reactivateUser(user.id)
    suspended.value = suspended.value.filter((u) => u.id !== user.id)
    await load()
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('dashboard.accountManagement.actionError')
  } finally {
    actioningId.value = null
  }
}

async function handleResendInvitation(user: ManagedUser) {
  actioningId.value = user.id
  try {
    await resendInvitation(user.id)
    resentIds.value = new Set(resentIds.value).add(user.id)
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('dashboard.accountManagement.actionError')
  } finally {
    actioningId.value = null
  }
}
</script>

<template>
  <div>
    <div class="mx-auto max-w-3xl">
      <h1 class="text-xl font-bold text-navy-900">{{ t('dashboard.accountManagement.pageTitle') }}</h1>

      <div class="mt-4 flex gap-1 border-b border-line-strong">
        <button
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === 'active' ? 'border-sky-400 text-navy-900' : 'border-transparent text-navy-700/60 hover:text-navy-900'"
          @click="switchTab('active')"
        >
          {{ t('dashboard.accountManagement.tabs.active') }} ({{ active.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === 'suspended' ? 'border-sky-400 text-navy-900' : 'border-transparent text-navy-700/60 hover:text-navy-900'"
          @click="switchTab('suspended')"
        >
          {{ t('dashboard.accountManagement.tabs.suspended') }} ({{ suspended.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === 'pending' ? 'border-sky-400 text-navy-900' : 'border-transparent text-navy-700/60 hover:text-navy-900'"
          @click="switchTab('pending')"
        >
          {{ t('dashboard.accountManagement.tabs.pending') }} ({{ pending.length }})
        </button>
      </div>

      <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('dashboard.accountManagement.loading') }}</p>
      <p
        v-else-if="status === 'error'"
        class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="items.length === 0" class="mt-6 text-sm text-navy-700/60">
        {{
          tab === 'active'
            ? t('dashboard.accountManagement.emptyActive')
            : tab === 'suspended'
              ? t('dashboard.accountManagement.emptySuspended')
              : t('dashboard.accountManagement.emptyPending')
        }}
      </p>

      <div v-else class="mt-4 space-y-3">
        <div
          v-for="user in items"
          :key="user.id"
          class="rounded-md border border-line-strong bg-white p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-semibold text-navy-900">{{ user.nombre }}</p>
              <p class="text-sm text-navy-700/70">
                {{ t(`dashboard.accountManagement.documentType.${user.documentType}`) }}: {{ user.documentNumber }}
              </p>
              <p class="text-xs text-navy-700/60">{{ user.email }}</p>
              <p class="mt-1 text-xs text-navy-700/60">
                {{ user.organizations.map((o) => o.organization.nombre).join(', ') }}
              </p>
              <p class="mt-1 text-xs text-navy-700/50">
                {{ formatDateTime(user.createdAt, locale as Locale) }}
              </p>
              <p v-if="user.suspendReason" class="mt-2 rounded-sm bg-red-50 px-3 py-2 text-xs text-red-700">
                {{ t('dashboard.accountManagement.suspendReasonLabel') }}: {{ user.suspendReason }}
              </p>
            </div>

            <div class="flex shrink-0 gap-2">
              <template v-if="tab === 'active'">
                <button
                  type="button"
                  class="rounded-sm border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  :disabled="actioningId === user.id"
                  @click="suspendTarget = user"
                >
                  {{ t('dashboard.accountManagement.suspend') }}
                </button>
              </template>
              <template v-else-if="tab === 'suspended'">
                <button
                  type="button"
                  class="rounded-sm bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  :disabled="actioningId === user.id"
                  @click="handleReactivate(user)"
                >
                  {{ t('dashboard.accountManagement.reactivate') }}
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="rounded-sm border border-line-strong px-3 py-1.5 text-sm font-semibold text-navy-700 hover:border-navy-900 disabled:opacity-50"
                  :disabled="actioningId === user.id || resentIds.has(user.id)"
                  @click="handleResendInvitation(user)"
                >
                  {{ resentIds.has(user.id) ? t('dashboard.accountManagement.invitationResent') : t('dashboard.accountManagement.resendInvitation') }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SuspendUserModal
      v-if="suspendTarget"
      :nombre="suspendTarget.nombre"
      :email="suspendTarget.email"
      @confirm="handleSuspend"
      @cancel="suspendTarget = null"
    />
  </div>
</template>
