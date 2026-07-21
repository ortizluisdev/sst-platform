<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'

const { t, locale } = useI18n()
</script>

<template>
  <section id="roma-plus" class="relative overflow-hidden bg-cream px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <component :is="AnimatedNetworkBackgroundAsync" />

    <div class="pointer-events-none relative z-[2] mx-auto max-w-[820px]">
      <div v-reveal class="mx-auto mb-14 max-w-[640px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          {{ t('romaPlus.eyebrow') }}
        </div>
        <h2 class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900">
          {{ t('romaPlus.title') }}
        </h2>
      </div>

      <div
        v-reveal
        class="pointer-events-auto flex flex-col items-center gap-4 rounded-lg border border-line-strong bg-gradient-to-br from-sky-100 to-white px-6 py-14 text-center sm:px-14"
      >
        <svg class="h-9 w-9 text-sky-400 opacity-70" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="13" rx="1.5" stroke="currentColor" stroke-width="1.4" />
          <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <path
            d="M7 13l3-4 2.5 2.5L17 7"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <p class="max-w-[520px] text-[14.5px] leading-[1.75] text-navy-700">
          {{ t('romaPlus.description') }}
        </p>

        <div class="mt-3 flex flex-wrap items-center justify-center gap-3.5">
          <router-link
            :to="`/${locale}/ingresar`"
            class="inline-flex items-center gap-2 rounded-sm border border-navy-900 bg-navy-900 px-7 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-250 hover:bg-transparent hover:text-navy-900"
          >
            {{ t('romaPlus.loginCta') }}
          </router-link>
          <router-link
            :to="`/${locale}/registro`"
            class="inline-flex items-center gap-2 rounded-sm border border-navy-900 bg-transparent px-7 py-3.5 text-sm font-medium tracking-wide text-navy-900 transition-all duration-250 hover:bg-navy-900 hover:text-cream"
          >
            {{ t('romaPlus.registerCta') }}
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>
