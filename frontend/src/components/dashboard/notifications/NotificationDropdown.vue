<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/notification.service'
import { useNotificationsStore } from '@/stores/notifications'
import NotificationItem from './NotificationItem.vue'
import type { AppNotification } from '@/types/notification'

const props = defineProps<{ open: boolean }>()
const { t, locale } = useI18n()
const store = useNotificationsStore()
const route = useRoute()

// "Ver todas" tiene que quedar DENTRO del layout con sidebar, igual que el
// ítem "Notificaciones" del sidebar (que nunca navega de ruta, solo cambia
// de pestaña — ver DashboardSidebar.vue). Antes esto navegaba a una ruta
// standalone (`/dashboard/notificaciones`) que no tenía sidebar en absoluto.
// - Admin: `/dashboard/admin/notificaciones` SÍ está envuelta en AdminShell
//   (con su propio sidebar), así que ahí navegar de ruta funciona bien.
// - Cliente: no hay ruta equivalente envuelta — en vez de crear una, se
//   reusa la ruta actual del servicio con `?tab=notificaciones`, que
//   ClientDashboardView.vue lee para activar la misma pestaña que el
//   sidebar.
const viewAllTarget = computed(() => {
  if (route.path.includes('/dashboard/admin')) return `/${locale.value}/dashboard/admin/notificaciones`
  const serviceSlug = typeof route.params.serviceSlug === 'string' ? route.params.serviceSlug : null
  if (serviceSlug) return `/${locale.value}/dashboard/${serviceSlug}?tab=notificaciones`
  return `/${locale.value}/dashboard/notificaciones`
})

const items = ref<AppNotification[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const result = await listNotifications({ pageSize: 8 })
    items.value = result.items
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

// `immediate: true` es obligatorio acá: NotificationBell.vue monta este
// componente vía `v-if="open"`, así que `open` ya vale `true` en el instante
// del montaje — un watch sin `immediate` nunca ve ese primer valor, solo
// dispara ante cambios posteriores (que nunca llegan, porque el padre
// destruye/vuelve a crear el componente en cada toggle). Sin esto, la lista
// se quedaba vacía ("No tienes notificaciones") hasta navegar a "Ver todas".
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) load()
  },
  { immediate: true },
)

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

async function handleMarkAllRead() {
  const previouslyUnread = items.value.filter((n) => !n.isRead).map((n) => n.id)
  items.value.forEach((n) => {
    if (!n.isRead) {
      n.isRead = true
      n.readAt = new Date().toISOString()
    }
  })
  store.resetUnread()
  try {
    await markAllNotificationsRead()
  } catch {
    items.value.forEach((n) => {
      if (previouslyUnread.includes(n.id)) {
        n.isRead = false
        n.readAt = null
      }
    })
    await store.fetchUnreadCount()
  }
}
</script>

<template>
  <div
    class="absolute right-0 top-full z-30 mt-2 w-[min(90vw,380px)] rounded-md border border-line-strong bg-white shadow-lg"
    role="menu"
  >
    <div class="flex items-center justify-between border-b border-line px-4 py-3">
      <h3 class="text-sm font-semibold text-navy-900">{{ t('dashboard.notifications.title') }}</h3>
      <button
        v-if="items.some((n) => !n.isRead)"
        type="button"
        class="text-xs font-medium text-sky-600 hover:text-sky-700"
        @click="handleMarkAllRead"
      >
        {{ t('dashboard.notifications.markAllRead') }}
      </button>
    </div>

    <div class="max-h-[60vh] overflow-y-auto">
      <p v-if="loading" class="px-4 py-6 text-center text-sm text-navy-700/60">{{ t('dashboard.notifications.loading') }}</p>
      <p v-else-if="items.length === 0" class="px-4 py-6 text-center text-sm text-navy-700/60">
        {{ t('dashboard.notifications.empty') }}
      </p>
      <NotificationItem
        v-for="notification in items"
        v-else
        :key="notification.id"
        :notification="notification"
        compact
        @mark-read="handleMarkRead"
      />
    </div>

    <div class="border-t border-line px-4 py-2.5 text-center">
      <router-link :to="viewAllTarget" class="text-sm font-medium text-sky-600 hover:text-sky-700">
        {{ t('dashboard.notifications.viewAll') }}
      </router-link>
    </div>
  </div>
</template>
