<script setup lang="ts">
import SiteHeader from '@/components/shared/SiteHeader.vue'
import SiteFooter from '@/components/shared/SiteFooter.vue'
import SocialLinks from '@/components/shared/SocialLinks.vue'
</script>

<template>
  <div class="min-h-screen bg-cream">
    <SiteHeader />
    <main>
      <slot />
    </main>
    <SiteFooter />
    <SocialLinks variant="floating" />
  </div>
</template>
