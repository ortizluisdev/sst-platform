<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{ variant?: 'floating' | 'footer' }>(), { variant: 'footer' })

const { t } = useI18n()

const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER ?? '573000000000'
const whatsappHref = computed(
  () => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('social.whatsappMessage'))}`,
)
const facebookHref = import.meta.env.VITE_FACEBOOK_URL ?? '#'
const instagramHref = import.meta.env.VITE_INSTAGRAM_URL ?? '#'
const tiktokHref = import.meta.env.VITE_TIKTOK_URL ?? '#'
const xHref = import.meta.env.VITE_X_URL ?? '#'
</script>

<template>
  <!-- Floating WhatsApp CTA, matches the approved mockup exactly -->
  <a
    v-if="variant === 'floating'"
    :href="whatsappHref"
    target="_blank"
    rel="noopener"
    :aria-label="t('social.whatsappTooltip')"
    class="group fixed bottom-6 right-6 z-[200] flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp shadow-[0_6px_18px_rgba(11,26,51,0.22)] transition-transform duration-200 hover:scale-[1.08]"
  >
    <span
      class="pointer-events-none absolute right-[66px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-navy-900 px-3 py-1.5 text-[12.5px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
    >
      {{ t('social.whatsappTooltip') }}
    </span>
    <svg class="h-7 w-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 2C8.28 2 2 8.16 2 15.75c0 2.6.72 5.03 1.98 7.12L2 30l7.36-1.92a14.1 14.1 0 0 0 6.64 1.67c7.72 0 14-6.16 14-13.75S23.72 2 16 2z"
        fill="#FFFFFF"
      />
      <path
        d="M16 3.6c-6.85 0-12.4 5.44-12.4 12.15 0 2.4.68 4.63 1.87 6.53l.28.45-1.14 4.16 4.32-1.13.44.26a12.36 12.36 0 0 0 6.63 1.9c6.85 0 12.4-5.44 12.4-12.15S22.85 3.6 16 3.6z"
        fill="#25D366"
      />
      <path
        d="M11.9 9.3c-.27-.6-.55-.61-.8-.62l-.68-.01c-.24 0-.63.09-.96.44-.33.36-1.26 1.22-1.26 2.98 0 1.75 1.29 3.45 1.47 3.69.18.24 2.5 3.94 6.18 5.37 3.06 1.19 3.68.95 4.34.9.67-.06 2.17-.88 2.47-1.73.3-.85.3-1.58.21-1.73-.09-.15-.33-.24-.7-.42-.36-.18-2.17-1.06-2.5-1.18-.34-.12-.58-.18-.83.18-.24.36-.94 1.18-1.15 1.42-.21.24-.42.27-.79.09-.36-.18-1.52-.55-2.9-1.77-1.07-.94-1.79-2.11-2-2.47-.21-.36-.02-.55.16-.73.16-.16.36-.42.55-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.79-1.98-1.1-2.66z"
        fill="#FFFFFF"
      />
    </svg>
  </a>

  <!-- Footer row: WhatsApp / Facebook / Instagram -->
  <div v-else class="flex items-center gap-3">
    <a
      :href="whatsappHref"
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp/10 text-whatsapp transition-colors hover:bg-whatsapp hover:text-white"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.5C6.75 2.5 2.5 6.75 2.5 12c0 1.83.52 3.53 1.4 4.98L2.5 21.5l4.65-1.36a9.44 9.44 0 0 0 4.85 1.34c5.25 0 9.5-4.25 9.5-9.5S17.25 2.5 12 2.5z"
        />
        <path
          d="M8.5 8.8c.4-.9 1.1-.85 1.65-.85.2 0 .43.15.6.55l.7 1.8c.13.3.06.55-.1.75l-.5.6c-.15.2-.1.45.05.7.5.85 1.65 2 2.9 2.6.25.12.5.1.68-.1l.65-.75c.2-.22.4-.28.68-.16l1.8.8c.3.13.4.3.4.6-.03.85-.9 1.55-1.7 1.6-1.5.1-3.2-.55-4.9-2.1-1.5-1.4-2.35-2.9-2.7-4.1-.15-.5-.3-1.15-.16-1.94z"
        />
      </svg>
    </a>
    <a
      :href="facebookHref"
      target="_blank"
      rel="noopener"
      aria-label="Facebook"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-navy-700 transition-colors hover:bg-navy-900 hover:text-white"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15 4h-2a4 4 0 0 0-4 4v2H7v3h2v7h3v-7h2.6l.4-3H12V8a1 1 0 0 1 1-1h2V4z" stroke-linejoin="round" />
      </svg>
    </a>
    <a
      :href="instagramHref"
      target="_blank"
      rel="noopener"
      aria-label="Instagram"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-navy-700 transition-colors hover:bg-navy-900 hover:text-white"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    </a>
    <a
      :href="tiktokHref"
      target="_blank"
      rel="noopener"
      aria-label="TikTok"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-navy-700 transition-colors hover:bg-navy-900 hover:text-white"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15 3v10.8a3.6 3.6 0 1 1-3-3.55" />
        <path d="M15 3c.3 2.4 2 4.2 4.4 4.5" />
      </svg>
    </a>
    <a
      :href="xHref"
      target="_blank"
      rel="noopener"
      aria-label="X (Twitter)"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-navy-700 transition-colors hover:bg-navy-900 hover:text-white"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    </a>
  </div>
</template>
