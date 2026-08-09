<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import NotificationFormModal from './NotificationFormModal.vue'
import {
  listAdminNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  NotificationRequestError,
} from '@/services/notification.service'
import { NOTIFICATION_SEVERITY_STYLES, NOTIFICATION_TYPE_LABEL_KEY } from '@/utils/notificationSeverityStyles'
import { formatDateTime } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { AppNotification, CreateNotificationInput, UpdateNotificationInput } from '@/types/notification'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { t, locale } = useI18n()

useHead(() => ({ title: t('dashboard.notificationsAdmin.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const activeTab = ref<'active' | 'history'>('active')
const status = ref<'loading' | 'ready' | 'error'>('loading')
const items = ref<AppNotification[]>([])
const page = ref(1)
const totalPages = ref(1)

const showFormModal = ref(false)
const editingNotification = ref<AppNotification | null>(null)

async function load() {
  status.value = 'loading'
  try {
    const result = await listAdminNotifications({
      page: page.value,
      pageSize: 20,
      deletedOnly: activeTab.value === 'history',
    })
    items.value = result.items
    totalPages.value = result.totalPages
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof NotificationRequestError ? err.message : t('dashboard.notificationsAdmin.loadError'))
  }
}

onMounted(load)
watch(activeTab, () => {
  page.value = 1
  load()
})
watch(page, load)

function openCreate() {
  editingNotification.value = null
  showFormModal.value = true
}

function openEdit(notification: AppNotification) {
  editingNotification.value = notification
  showFormModal.value = true
}

async function handleSubmitCreate(input: CreateNotificationInput) {
  await createNotification(input)
  showFormModal.value = false
  await load()
}

async function handleSubmitEdit(input: UpdateNotificationInput) {
  if (!editingNotification.value) return
  await updateNotification(editingNotification.value.id, input)
  showFormModal.value = false
  await load()
}

async function handleDelete(notification: AppNotification) {
  const confirmed = await useConfirm().confirm({
    title: t('dashboard.notificationsAdmin.delete'),
    message: t('dashboard.notificationsAdmin.deleteConfirm'),
    confirmLabel: t('dashboard.notificationsAdmin.delete'),
  })
  if (!confirmed) return
  try {
    await deleteNotification(notification.id)
    await load()
  } catch {
    useToast().error(t('dashboard.notificationsAdmin.deleteError'))
  }
}
</script>

<template>
  <div>
    <SectionTitleBanner :title="t('dashboard.notificationsAdmin.title')" />

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'active' ? 'bg-navy-900 text-cream' : 'border border-line-strong text-navy-700'"
          @click="activeTab = 'active'"
        >
          {{ t('dashboard.notificationsAdmin.tabActive') }}
        </button>
        <button
          type="button"
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'history' ? 'bg-navy-900 text-cream' : 'border border-line-strong text-navy-700'"
          @click="activeTab = 'history'"
        >
          {{ t('dashboard.notificationsAdmin.tabHistory') }}
        </button>
      </div>

      <button
        type="button"
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream hover:opacity-90"
        @click="openCreate"
      >
        {{ t('dashboard.notificationsAdmin.newButton') }}
      </button>
    </div>

    <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('dashboard.notifications.loading') }}</p>
    <p v-else-if="items.length === 0" class="mt-6 text-sm text-navy-700/60">
      {{ activeTab === 'active' ? t('dashboard.notificationsAdmin.empty') : t('dashboard.notificationsAdmin.emptyHistory') }}
    </p>

    <div v-else class="mt-4 overflow-hidden rounded-md border border-line-strong bg-white">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.notificationsAdmin.colRecipient') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.notificationsAdmin.colMessage') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.notificationsAdmin.colType') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.notificationsAdmin.colSeverity') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.notificationsAdmin.colDate') }}</th>
              <th v-if="activeTab === 'active'" class="px-4 py-2.5 font-semibold">
                {{ t('dashboard.notificationsAdmin.colActions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="notification in items" :key="notification.id" class="border-t border-line">
              <td class="px-4 py-3 text-navy-900">{{ notification.recipient?.nombre ?? '—' }}</td>
              <td class="max-w-xs truncate px-4 py-3 text-navy-700" :title="notification.message">
                {{ notification.message }}
              </td>
              <td class="px-4 py-3 text-navy-700">{{ t(NOTIFICATION_TYPE_LABEL_KEY[notification.type]) }}</td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    NOTIFICATION_SEVERITY_STYLES[notification.severity].bg,
                    NOTIFICATION_SEVERITY_STYLES[notification.severity].text,
                    NOTIFICATION_SEVERITY_STYLES[notification.severity].border,
                  ]"
                  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase"
                >
                  <span :class="NOTIFICATION_SEVERITY_STYLES[notification.severity].dot" class="h-1.5 w-1.5 rounded-full" />
                  {{ t(`dashboard.notifications.severity.${notification.severity.toLowerCase()}`) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-navy-700">
                {{ formatDateTime(notification.createdAt, locale as Locale) }}
              </td>
              <td v-if="activeTab === 'active'" class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-navy-700 hover:bg-sky-100"
                    :aria-label="t('dashboard.notificationsAdmin.edit')"
                    @click="openEdit(notification)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-red-600 hover:bg-red-50"
                    :aria-label="t('dashboard.notificationsAdmin.delete')"
                    @click="handleDelete(notification)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="status === 'ready' && totalPages > 1" class="mt-4 flex items-center justify-between text-sm">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-sm border border-line-strong px-3 py-1.5 text-navy-700 disabled:opacity-40"
        :disabled="page <= 1"
        @click="page -= 1"
      >
        <ChevronLeft class="h-4 w-4" />
        {{ t('dashboard.notifications.pagination.prev') }}
      </button>
      <span class="text-navy-700/70">{{ t('dashboard.notifications.pagination.pageOf', { page, totalPages }) }}</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-sm border border-line-strong px-3 py-1.5 text-navy-700 disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="page += 1"
      >
        {{ t('dashboard.notifications.pagination.next') }}
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>

    <NotificationFormModal
      v-if="showFormModal"
      :mode="editingNotification ? 'edit' : 'create'"
      :initial-message="editingNotification?.message"
      :initial-severity="editingNotification?.severity"
      @close="showFormModal = false"
      @submit-create="handleSubmitCreate"
      @submit-edit="handleSubmitEdit"
    />
  </div>
</template>
