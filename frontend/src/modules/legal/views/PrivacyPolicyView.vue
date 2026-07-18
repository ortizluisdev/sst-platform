<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import PublicLayout from '@/layouts/PublicLayout.vue'

const { t } = useI18n()
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

useHead(() => ({ title: `${t('privacyPolicy.title')} — RoMa` }))
</script>

<template>
  <PublicLayout>
    <section class="px-6 py-[100px] sm:px-8 md:px-16">
      <div class="mx-auto max-w-[720px]">
        <h1 class="font-serif text-[clamp(26px,3.4vw,36px)] font-semibold leading-[1.28] text-navy-900">
          {{ t('privacyPolicy.title') }}
        </h1>
        <p class="mt-2 text-xs uppercase tracking-[0.1em] text-navy-700 opacity-70">
          {{ t('privacyPolicy.updated') }}
        </p>

        <p class="mt-8 text-[15px] leading-[1.75] text-navy-700">{{ t('privacyPolicy.intro') }}</p>

        <h2 class="mb-2 mt-9 font-serif text-lg font-semibold text-navy-900">
          {{ t('privacyPolicy.purposeTitle') }}
        </h2>
        <p class="text-[15px] leading-[1.75] text-navy-700">{{ t('privacyPolicy.purposeBody') }}</p>

        <h2 class="mb-2 mt-9 font-serif text-lg font-semibold text-navy-900">
          {{ t('privacyPolicy.confidentialityTitle') }}
        </h2>
        <p class="text-[15px] leading-[1.75] text-navy-700">{{ t('privacyPolicy.confidentialityBody') }}</p>

        <h2 class="mb-2 mt-9 font-serif text-lg font-semibold text-navy-900">
          {{ t('privacyPolicy.rightsTitle') }}
        </h2>
        <i18n-t keypath="privacyPolicy.rightsBody" tag="p" class="text-[15px] leading-[1.75] text-navy-700">
          <template #email
            ><a :href="`mailto:${contactEmail}`" class="text-sky-500 underline underline-offset-2">{{
              contactEmail
            }}</a></template
          >
        </i18n-t>

        <h2 class="mb-2 mt-9 font-serif text-lg font-semibold text-navy-900">
          {{ t('privacyPolicy.consentTitle') }}
        </h2>
        <p class="text-[15px] leading-[1.75] text-navy-700">{{ t('privacyPolicy.consentBody') }}</p>
      </div>
    </section>
  </PublicLayout>
</template>
