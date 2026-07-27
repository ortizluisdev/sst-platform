<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Check } from 'lucide-vue-next'
import type { AppNotification } from '@/types/notification'
import type { Locale } from '@/i18n'
import { formatDateTime } from '@/utils/formatDate'
import { NOTIFICATION_SEVERITY_STYLES, NOTIFICATION_TYPE_LABEL_KEY } from '@/utils/notificationSeverityStyles'

const props = defineProps<{ notification: AppNotification; compact?: boolean }>()
const emit = defineEmits<{ markRead: [id: string] }>()

const { t, locale } = useI18n()
const router = useRouter()

const style = computed(() => NOTIFICATION_SEVERITY_STYLES[props.notification.severity])
const typeLabelKey = computed(() => NOTIFICATION_TYPE_LABEL_KEY[props.notification.type])
const timestamp = computed(() => formatDateTime(props.notification.createdAt, locale.value as Locale))

function handleOpen() {
  if (!props.notification.isRead) emit('markRead', props.notification.id)
  if (props.notification.link) {
    router.push(`/${locale.value}${props.notification.link}`)
  }
}
</script>

<template>
  <div
    class="flex gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-cream"
    :class="[notification.isRead ? 'opacity-70' : '', notification.link ? 'cursor-pointer' : '']"
    @click="notification.link ? handleOpen() : undefined"
  >
    <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="notification.isRead ? 'bg-transparent' : style.dot" />

    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          :class="[style.bg, style.text]"
        >
          {{ t(typeLabelKey) }}
        </span>
        <span class="shrink-0 text-[11px] text-navy-700/60">{{ timestamp }}</span>
      </div>

      <p class="mt-1 text-sm leading-snug text-navy-900" :class="compact ? 'line-clamp-2' : ''">
        {{ notification.message }}
      </p>

      <button
        v-if="!notification.isRead"
        type="button"
        class="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
        @click.stop="emit('markRead', notification.id)"
      >
        <Check class="h-3.5 w-3.5" />
        {{ t('dashboard.notifications.markRead') }}
      </button>
    </div>
  </div>
</template>
