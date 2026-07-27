<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import logoPng from '@/assets/logo/roma-logo.png'
import logoWebp from '@/assets/logo/roma-logo.webp'

defineProps<{
  title: string
  subtitle?: string
}>()

const { t, locale } = useI18n()
</script>

<template>
  <section class="relative flex min-h-[calc(100vh-1px)] items-center justify-center bg-cream px-6 py-16 sm:px-8">
    <!-- El logo ya lleva al inicio, pero no es obvio que sea clicable — este
    link explícito es la salida real para quien entra a una pantalla de auth
    y todavía no quiere continuar. -->
    <router-link
      :to="`/${locale}/`"
      class="group fixed left-5 top-5 inline-flex items-center gap-2 text-sm font-medium text-navy-700 transition-colors hover:text-sky-500 sm:left-8 sm:top-8"
    >
      <svg
        class="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 12H5M5 12l6-6M5 12l6 6"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ t('auth.backToHome') }}
    </router-link>

    <div class="w-full max-w-[440px]">
      <router-link :to="`/${locale}/`" class="mb-8 flex justify-center">
        <picture>
          <source :srcset="logoWebp" type="image/webp" />
          <img :src="logoPng" alt="RoMa — Ciencia Aplicada" class="block h-9 w-auto" width="572" height="166" />
        </picture>
      </router-link>

      <div class="rounded-lg border border-line-strong bg-white p-7 shadow-[0_24px_60px_rgba(11,26,51,0.06)] sm:p-10">
        <div class="mb-7 text-center">
          <h1 class="font-serif text-[clamp(22px,2.6vw,28px)] font-semibold text-navy-900">{{ title }}</h1>
          <p v-if="subtitle" class="mt-2 text-sm leading-relaxed text-navy-700 opacity-85">{{ subtitle }}</p>
        </div>

        <slot />
      </div>

      <p v-if="$slots.footer" class="mt-6 text-center text-sm text-navy-700">
        <slot name="footer" />
      </p>
    </div>
  </section>
</template>
