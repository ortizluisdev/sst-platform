<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bell } from 'lucide-vue-next'
import { useNotificationsStore } from '@/stores/notifications'
import NotificationDropdown from './NotificationDropdown.vue'

const { t } = useI18n()
const store = useNotificationsStore()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function handleClickOutside(event: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  store.startPolling()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  store.stopPolling()
})
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="relative rounded-full bg-sky-100/60 p-2 text-navy-700 transition-colors hover:bg-sky-100"
      :aria-label="t('dashboard.notifications.bellLabel')"
      @click="toggle"
    >
      <Bell class="h-5 w-5" />
      <span
        v-if="store.unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
      >
        {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
      </span>
    </button>

    <NotificationDropdown v-if="open" :open="open" />
  </div>
</template>
