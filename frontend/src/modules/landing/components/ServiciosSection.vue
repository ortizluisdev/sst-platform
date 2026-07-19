<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'
import AccordionPanel, { type AccordionItem } from '@/components/ui/AccordionPanel.vue'

interface ServiceItem extends AccordionItem {
  description: string
  tags: string[]
  techLabel: string
  techText: string
}

interface TranslatedServiceItem {
  label: string
  title: string
  tagline: string
  description: string
  tags: string[]
  techLabel: string
  techText: string
}

const { t, tm } = useI18n()

const iconData = [
  {
    id: 'higiene',
    num: '01',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4C24 4 14 16 14 26C14 31.5 18.5 36 24 36C29.5 36 34 31.5 34 26C34 16 24 4 24 4Z" stroke="#1E3A66" stroke-width="1.6"/><circle cx="24" cy="27" r="4.5" stroke="#5B8DC7" stroke-width="1.4"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 5C28 5 16 19 16 30C16 37 21.4 42 28 42C34.6 42 40 37 40 30C40 19 28 5 28 5Z" stroke="#1E3A66" stroke-width="1.8"/><circle cx="28" cy="31" r="5.4" stroke="#5B8DC7" stroke-width="1.6"/></svg>`,
  },
  {
    id: 'vial',
    num: '02',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="17" stroke="#1E3A66" stroke-width="1.6"/><path d="M24 14V24L30 28" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="20" stroke="#1E3A66" stroke-width="1.8"/><path d="M28 16V28L35 33" stroke="#5B8DC7" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'mecanico',
    num: '03',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 31L28 20a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0L13 27" stroke="#1E3A66" stroke-width="1.6" stroke-linecap="round"/><path d="M13 27l-3 7 7-3" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 36L33 23a3.5 3.5 0 0 0 0-5 3.5 3.5 0 0 0-5 0L15 31" stroke="#1E3A66" stroke-width="1.8" stroke-linecap="round"/><path d="M15 31l-3.5 8 8-3.5" stroke="#5B8DC7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'mantenimiento',
    num: '04',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="6" stroke="#1E3A66" stroke-width="1.6"/><path d="M24 12v4M24 32v4M36 24h-4M16 24h-4M32.5 15.5l-2.8 2.8M18.3 29.7l-2.8 2.8M32.5 32.5l-2.8-2.8M18.3 18.3l-2.8-2.8" stroke="#5B8DC7" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="7" stroke="#1E3A66" stroke-width="1.8"/><path d="M28 14v5M28 37v5M42 28h-5M19 28h-5M38 18l-3.5 3.5M21.5 34.5L18 38M38 38l-3.5-3.5M21.5 21.5L18 18" stroke="#5B8DC7" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'comportamiento',
    num: '05',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="18" r="3.4" stroke="#1E3A66" stroke-width="1.5"/><circle cx="32" cy="18" r="3.4" stroke="#1E3A66" stroke-width="1.5"/><circle cx="24" cy="32" r="3.4" stroke="#5B8DC7" stroke-width="1.5"/><path d="M18.8 20.3L21.6 29M29.2 20.3L26.4 29M19.4 18h9.2" stroke="#5B8DC7" stroke-width="1.3" opacity="0.7"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="21" r="4" stroke="#1E3A66" stroke-width="1.7"/><circle cx="37" cy="21" r="4" stroke="#1E3A66" stroke-width="1.7"/><circle cx="28" cy="37" r="4" stroke="#5B8DC7" stroke-width="1.7"/><path d="M21.8 24.6L25.2 33.6M34.2 24.6L30.8 33.6M22.5 21h11" stroke="#5B8DC7" stroke-width="1.5" opacity="0.7"/></svg>`,
  },
]

const items = computed<ServiceItem[]>(() => {
  const translated = tm('servicios.items') as unknown as TranslatedServiceItem[]
  return iconData.map((icon, index) => ({ ...icon, ...translated[index] }))
})
</script>

<template>
  <section id="servicios" class="relative overflow-hidden bg-cream px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <component :is="AnimatedNetworkBackgroundAsync" />

    <div class="pointer-events-none relative z-[2] mx-auto max-w-[1280px]">
      <div v-reveal class="mx-auto mb-16 max-w-[680px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          {{ t('servicios.eyebrow') }}
        </div>
        <i18n-t
          keypath="servicios.title"
          tag="h2"
          class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900"
        >
          <template #accent
            ><em class="font-medium italic text-sky-400">{{ t('servicios.titleAccent') }}</em></template
          >
        </i18n-t>
        <p class="mt-[18px] text-[15px] leading-relaxed text-navy-700 opacity-85">
          {{ t('servicios.subtitle') }}
        </p>
      </div>

      <div v-reveal="100" class="pointer-events-auto">
        <AccordionPanel :items="items">
          <template #content="{ item }">
            <!-- eslint-disable vue/no-v-html -- content comes from src/i18n/locales/*.json, not user input -->
            <p
              class="mb-[22px] max-w-[660px] text-sm leading-[1.75] text-navy-700 [&_strong]:font-semibold [&_strong]:text-navy-900"
              v-html="(item as ServiceItem).description"
            />
            <!-- eslint-enable vue/no-v-html -->
            <div class="mb-auto flex flex-wrap gap-2">
              <span
                v-for="tag in (item as ServiceItem).tags"
                :key="tag"
                class="rounded-full border border-line-strong bg-sky-100 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-navy-700"
              >
                {{ tag }}
              </span>
            </div>
            <div
              class="mt-6 max-w-[680px] border-t border-line-strong pt-5 text-[12.5px] leading-relaxed text-navy-700 opacity-85 [&_strong]:font-semibold [&_strong]:text-navy-900 [&_strong]:opacity-100"
            >
              <strong>{{ (item as ServiceItem).techLabel }}</strong>
              <!-- eslint-disable-next-line vue/no-v-html -- content comes from src/i18n/locales/*.json, not user input -->
              <span v-html="(item as ServiceItem).techText" />
            </div>
          </template>
        </AccordionPanel>
      </div>
    </div>
  </section>
</template>
