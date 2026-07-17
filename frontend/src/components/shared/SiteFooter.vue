<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SocialLinks from './SocialLinks.vue'

const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-panel-blue-deep px-6 py-16 text-sky-100 sm:px-8 md:px-12 lg:px-16">
    <div class="mx-auto grid max-w-6xl gap-12 md:grid-cols-3">
      <div>
        <p class="font-serif text-xl font-semibold text-white">RoMa</p>
        <p class="mt-3 max-w-xs text-[13.5px] leading-relaxed text-sky-200">
          {{ t('footer.tagline') }}
        </p>
      </div>

      <nav class="flex flex-col gap-3 text-[13.5px]">
        <span class="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400">{{ t('footer.navTitle') }}</span>
        <a href="#servicios" class="text-sky-100 transition-colors hover:text-white">{{ t('nav.servicios') }}</a>
        <a href="#metodologia" class="text-sky-100 transition-colors hover:text-white">{{ t('nav.metodologia') }}</a>
        <a href="#nosotros" class="text-sky-100 transition-colors hover:text-white">{{ t('nav.nosotros') }}</a>
        <a href="#contacto" class="text-sky-100 transition-colors hover:text-white">{{ t('footer.contacto') }}</a>
      </nav>

      <div class="flex flex-col gap-4">
        <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400">{{ t('footer.socialTitle') }}</span>
        <SocialLinks variant="footer" />
      </div>
    </div>

    <div class="mx-auto mt-12 max-w-6xl border-t border-white/10 pt-6 text-[12px] text-sky-200/70">
      © {{ year }} {{ t('footer.copyright') }}
    </div>
  </footer>
</template>
