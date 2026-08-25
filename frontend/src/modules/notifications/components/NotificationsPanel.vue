<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import NotificationItem from '@/components/dashboard/notifications/NotificationItem.vue'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import { listNotifications, markNotificationRead, NotificationRequestError } from '@/services/notification.service'
import { useNotificationsStore } from '@/stores/notifications'
import { NOTIFICATION_TYPE_LABEL_KEY } from '@/utils/notificationSeverityStyles'
import type { AppNotification, NotificationSeverity, NotificationType } from '@/types/notification'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const store = useNotificationsStore()

useHead(() => ({ title: t('dashboard.notifications.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const status = ref<'loading' | 'ready' | 'error'>('loading')
const items = ref<AppNotification[]>([])
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)

const readFilter = ref<'all' | 'unread' | 'read'>('all')
const typeFilter = ref<NotificationType | 'all'>('all')
const severityFilter = ref<NotificationSeverity | 'all'>('all')

const NOTIFICATION_TYPES: NotificationType[] = [
  'SEMAFORO_CRITICO',
  'CARGA_PROCESADA',
  'CARGA_CON_ERROR',
  'CUENTA_SUSPENDIDA',
  'CUENTA_REACTIVADA',
  'REGISTRO_PENDIENTE',
  'CONTACTO_RECIBIDO',
  'LECTURA_CORREGIDA',
]

async function load() {
  status.value = 'loading'
  try {
    const result = await listNotifications({
      page: page.value,
      pageSize: 20,
      isRead: readFilter.value === 'all' ? undefined : readFilter.value === 'read',
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
      severity: severityFilter.value === 'all' ? undefined : severityFilter.value,
    })
    items.value = result.items
    totalPages.value = result.totalPages
    total.value = result.total
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof NotificationRequestError ? err.message : t('dashboard.notifications.loadError'))
  }
}

onMounted(load)

watch([readFilter, typeFilter, severityFilter], () => {
  page.value = 1
  load()
})

watch(page, load)

async function handleMarkRead(id: string) {
  const notif = items.value.find((n) => n.id === id)
  if (!notif || notif.isRead) return
  notif.isRead = true
  notif.readAt = new Date().toISOString()
  store.decrementUnread()
  try {
    await markNotificationRead(id)
  } catch {
    notif.isRead = false
    notif.readAt = null
    await store.fetchUnreadCount()
  }
}
</script>

<template>
  <div>
    <SectionTitleBanner :title="t('dashboard.notifications.title')" />

    <div class="mt-4 flex flex-wrap gap-2">
      <select
        v-model="readFilter"
        class="rounded-sm border border-line-strong bg-white px-2.5 py-1.5 text-sm text-navy-900"
      >
        <option value="all">{{ t('dashboard.notifications.filters.allStatus') }}</option>
        <option value="unread">{{ t('dashboard.notifications.filters.unread') }}</option>
        <option value="read">{{ t('dashboard.notifications.filters.read') }}</option>
      </select>

      <select
        v-model="severityFilter"
        class="rounded-sm border border-line-strong bg-white px-2.5 py-1.5 text-sm text-navy-900"
      >
        <option value="all">{{ t('dashboard.notifications.filters.allSeverities') }}</option>
        <option value="CRITICAL">{{ t('dashboard.notifications.severity.critical') }}</option>
        <option value="WARNING">{{ t('dashboard.notifications.severity.warning') }}</option>
        <option value="INFO">{{ t('dashboard.notifications.severity.info') }}</option>
      </select>

      <select
        v-model="typeFilter"
        class="rounded-sm border border-line-strong bg-white px-2.5 py-1.5 text-sm text-navy-900"
      >
        <option value="all">{{ t('dashboard.notifications.filters.allTypes') }}</option>
        <option v-for="type in NOTIFICATION_TYPES" :key="type" :value="type">
          {{ t(NOTIFICATION_TYPE_LABEL_KEY[type]) }}
        </option>
      </select>
    </div>

    <!-- Esqueleto con la forma real de las filas (NotificationItem.vue) en
    vez de un texto "Cargando..." — mismo criterio que MyProfilePanel.vue,
    evita el salto/parpadeo al reemplazar todo de golpe cuando llegan los
    datos. -->
    <div
      v-if="status === 'loading'"
      class="mt-4 animate-pulse overflow-hidden rounded-md border border-line-strong bg-white"
      role="presentation"
      aria-hidden="true"
    >
      <div v-for="i in 6" :key="i" class="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <div class="h-4 w-28 rounded-full bg-line-strong" />
            <div class="h-3 w-16 shrink-0 rounded-full bg-line-strong" />
          </div>
          <div class="mt-2 h-3.5 w-full max-w-md rounded-full bg-line-strong" />
        </div>
      </div>
    </div>
    <p v-else-if="items.length === 0" class="mt-6 text-sm text-navy-700/60">
      {{ t('dashboard.notifications.empty') }}
    </p>

    <div v-else class="mt-4 overflow-hidden rounded-md border border-line-strong bg-white">
      <NotificationItem
        v-for="notification in items"
        :key="notification.id"
        :notification="notification"
        @mark-read="handleMarkRead"
      />
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
  </div>
</template>
