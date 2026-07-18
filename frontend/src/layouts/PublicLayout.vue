<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SiteHeader from '@/components/shared/SiteHeader.vue'
import SiteFooter from '@/components/shared/SiteFooter.vue'
import SocialLinks from '@/components/shared/SocialLinks.vue'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-cream">
    <a
      href="#main-content"
      class="fixed left-4 top-4 z-[200] -translate-y-24 rounded-sm bg-navy-900 px-4 py-2.5 text-sm font-medium text-cream transition-transform focus:translate-y-0"
    >
      {{ t('nav.skipToContent') }}
    </a>
    <SiteHeader />
    <main id="main-content">
      <slot />
    </main>
    <SiteFooter />
    <SocialLinks variant="floating" />
  </div>
</template>
