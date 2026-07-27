import { defineStore } from 'pinia'
import { getUnreadCount } from '@/services/notification.service'

const POLL_INTERVAL_MS = 45_000

interface NotificationsState {
  unreadCount: number
  pollingHandle: ReturnType<typeof setInterval> | null
}

/**
 * Polling simple cada 45s para el contador de la campana — no justifica
 * WebSockets (cargas manuales/semanales, sin necesidad de tiempo real
 * instantáneo, decisión ya aprobada). Un fallo de red en el poll no debe
 * mostrar error al usuario, solo se reintenta en el siguiente ciclo.
 */
export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    unreadCount: 0,
    pollingHandle: null,
  }),

  actions: {
    async fetchUnreadCount() {
      try {
        this.unreadCount = await getUnreadCount()
      } catch {
        // silencioso a propósito — ver comentario de la clase
      }
    },

    startPolling() {
      if (this.pollingHandle) return
      this.fetchUnreadCount()
      this.pollingHandle = setInterval(() => this.fetchUnreadCount(), POLL_INTERVAL_MS)
    },

    stopPolling() {
      if (this.pollingHandle) {
        clearInterval(this.pollingHandle)
        this.pollingHandle = null
      }
    },

    decrementUnread(by = 1) {
      this.unreadCount = Math.max(0, this.unreadCount - by)
    },

    resetUnread() {
      this.unreadCount = 0
    },
  },
})
