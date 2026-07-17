<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'
import { useScrollReveal } from '@/composables/useScrollReveal'

interface Stat {
  target: number
  current: Ref<number>
  el: Ref<HTMLElement | null>
}

const { t, tm } = useI18n()

function makeStat(target: number): Stat {
  return { target, current: ref(0), el: ref(null) }
}

const statTargets = [15, 100, 7]
const stats = statTargets.map(makeStat)
const statLabels = computed(() => tm('nosotros.stats') as unknown as { label: string }[])

function animateCount(stat: Stat) {
  const duration = 1100
  const start = performance.now()
  function tick(now: number) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    stat.current.value = Math.round(eased * stat.target)
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

stats.forEach((stat) => useScrollReveal(stat.el, () => animateCount(stat), { threshold: 0.4 }))

const degreeIcons = [
  `<path d="M14.7 6.3l3 3-8.4 8.4-4 1 1-4 8.4-8.4z" stroke-linejoin="round"/><path d="M13 8l3 3"/>`,
  `<path d="M5 4h14M5 4v3l5 5-5 5v3M19 4v3l-5 5 5 5v3M9 20h6" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M4 19V9M10 19V5M16 19v-8M4 19h16" stroke-linecap="round"/>`,
  `<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>`,
  `<path d="M2 8l10-5 10 5-10 5-10-5z" stroke-linejoin="round"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 8v6" stroke-linecap="round"/>`,
]

const degrees = computed(() => {
  const labels = tm('nosotros.degrees') as unknown as string[]
  return degreeIcons.map((icon, index) => ({ icon, label: labels[index] }))
})

const researchItems = computed(() => tm('nosotros.research') as unknown as { degree: string; title: string; description: string }[])
const bioParagraphs = computed(() => tm('nosotros.profile.bio') as unknown as string[])
const degreesSub = computed(() => tm('nosotros.profile.degreesSub') as unknown as string[])

const openResearchIndex = ref(0)
function toggleResearch(index: number) {
  openResearchIndex.value = openResearchIndex.value === index ? -1 : index
}
</script>

<template>
  <section id="nosotros" class="relative overflow-hidden bg-cream px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <component :is="AnimatedNetworkBackgroundAsync" />

    <div class="relative z-[2] mx-auto max-w-[1180px]">
      <div v-reveal class="mx-auto mb-14 max-w-[680px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          {{ t('nosotros.eyebrow') }}
        </div>
        <i18n-t keypath="nosotros.title" tag="h2" class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900">
          <template #accent><em class="font-medium italic text-sky-400">{{ t('nosotros.titleAccent') }}</em></template>
        </i18n-t>
      </div>

      <!-- STAT STRIP -->
      <div v-reveal class="mb-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line-strong bg-line-strong shadow-[0_18px_46px_rgba(11,26,51,0.06)] sm:grid-cols-3">
        <div v-for="(stat, index) in stats" :key="index" class="bg-white px-5 py-[26px] text-center transition-colors hover:bg-sky-100">
          <div :ref="(el) => (stat.el.value = el as HTMLElement | null)" class="mb-2 font-serif text-[clamp(26px,3.4vw,36px)] font-semibold leading-none text-navy-900">
            {{ stat.current.value }}<span class="text-sky-400">+</span>
          </div>
          <div class="text-xs tracking-wide text-navy-700 opacity-85">{{ statLabels[index]?.label }}</div>
        </div>
      </div>

      <!-- PROFILE -->
      <div v-reveal class="mb-14 grid items-start gap-9 rounded-lg border border-line-strong bg-white p-7 shadow-[0_24px_60px_rgba(11,26,51,0.08)] sm:p-10 md:grid-cols-[200px_1fr] lg:grid-cols-[280px_1fr] lg:gap-16">
        <div class="group relative mx-auto aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-md border border-dashed border-line-strong bg-gradient-to-br from-sky-100 to-white transition-colors hover:border-sky-400 md:max-w-none">
          <div class="absolute inset-3.5 rounded border border-sky-200 opacity-0 transition-opacity duration-[350ms] group-hover:opacity-100" />
          <div class="flex h-full items-center justify-center">
            <svg class="h-[36%] w-[36%] opacity-50 transition-all duration-[400ms] group-hover:scale-[1.08] group-hover:opacity-75" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="#5B8DC7" stroke-width="1.2" />
              <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="#5B8DC7" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </div>
          <span class="absolute inset-x-0 bottom-3.5 text-center text-[11px] uppercase tracking-wide text-navy-700 opacity-55">{{ t('nosotros.profile.photoLabel') }}</span>
        </div>

        <div>
          <div class="mb-2.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z" stroke="currentColor" stroke-width="1.4" /></svg>
            {{ t('nosotros.profile.roleEyebrow') }}
          </div>
          <h3 class="mb-1.5 font-serif text-[clamp(22px,2.6vw,28px)] font-semibold leading-[1.3] text-navy-900">{{ t('nosotros.profile.roleTitle') }}</h3>
          <p class="mb-[22px] flex flex-wrap gap-y-1.5 text-[13.5px] leading-[1.7] text-navy-700">
            <template v-for="(item, index) in degreesSub" :key="item">
              <span>{{ item }}</span><span v-if="index < degreesSub.length - 1" class="mx-2 text-line-strong">·</span>
            </template>
          </p>

          <p v-for="(paragraph, index) in bioParagraphs" :key="index" class="mb-4 text-[14.5px] leading-[1.8] text-navy-700 last:mb-0">
            {{ paragraph }}
          </p>
        </div>
      </div>

      <div class="mb-8 grid gap-8 md:grid-cols-2">
        <!-- FORMACIÓN ACADÉMICA -->
        <div v-reveal class="rounded-lg border border-line-strong bg-white p-7 sm:p-9">
          <h4 class="mb-[22px] flex items-center gap-2.5 border-b border-line pb-4 text-xs font-bold uppercase tracking-[0.1em] text-navy-900">
            <svg class="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8l10-5 10 5-10 5-10-5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" stroke="currentColor" stroke-width="1.4" /></svg>
            {{ t('nosotros.formacionTitle') }}
          </h4>
          <ul class="flex flex-col gap-1">
            <li
              v-for="degree in degrees"
              :key="degree.label"
              class="group flex items-center gap-3.5 rounded-md px-2.5 py-2.5 text-[13.6px] leading-snug text-navy-700 transition-all hover:translate-x-0.5 hover:bg-sky-100"
            >
              <span class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-sky-100 transition-colors group-hover:bg-sky-400">
                <svg
                  class="h-4 w-4 stroke-sky-400 transition-colors group-hover:stroke-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke-width="1.3"
                  xmlns="http://www.w3.org/2000/svg"
                  v-html="degree.icon"
                />
              </span>
              {{ degree.label }}
            </li>
          </ul>
        </div>

        <!-- INVESTIGACIÓN CIENTÍFICA -->
        <div v-reveal="100" class="rounded-lg border border-line-strong bg-white p-7 sm:p-9">
          <h4 class="mb-[22px] flex items-center gap-2.5 border-b border-line pb-4 text-xs font-bold uppercase tracking-[0.1em] text-navy-900">
            <svg class="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.4" /><path d="M20 20l-4.3-4.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
            {{ t('nosotros.investigacionTitle') }}
          </h4>

          <div class="flex flex-col gap-2.5">
            <div
              v-for="(item, index) in researchItems"
              :key="item.title"
              class="overflow-hidden rounded-md border transition-colors"
              :class="openResearchIndex === index ? 'border-sky-200' : 'border-line'"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                :class="openResearchIndex === index ? 'bg-sky-100' : 'bg-white'"
                @click="toggleResearch(index)"
              >
                <span
                  class="flex h-5 w-5 flex-none items-center justify-center text-sky-400 transition-transform duration-300"
                  :class="openResearchIndex === index ? 'rotate-90' : ''"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="mb-1 block font-serif text-[13px] italic text-sky-400">{{ item.degree }}</span>
                  <span class="block text-[13.8px] font-semibold leading-snug text-navy-900">{{ item.title }}</span>
                </span>
              </button>
              <div
                class="grid bg-[#FCFDFE] transition-[grid-template-rows] duration-[400ms]"
                :style="{ gridTemplateRows: openResearchIndex === index ? '1fr' : '0fr' }"
              >
                <div class="overflow-hidden">
                  <p class="px-4 py-[18px] pl-12 text-[13.2px] leading-[1.7] text-navy-700">{{ item.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ANÁLISIS DE INVESTIGACIONES (placeholder) -->
      <div v-reveal class="rounded-lg border border-line-strong bg-white p-7 sm:p-9">
        <h4 class="mb-[22px] flex items-center gap-2.5 border-b border-line pb-4 text-xs font-bold uppercase tracking-[0.1em] text-navy-900">
          <svg class="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19V9M10 19V5M16 19v-8M4 19h16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
          {{ t('nosotros.analisisTitle') }}
        </h4>
        <div class="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-line-strong bg-gradient-to-br from-sky-100 to-white px-6 py-11 text-center">
          <svg class="h-[34px] w-[34px] text-sky-400 opacity-60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.3" />
            <path d="M20.5 20.5l-4.4-4.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            <path d="M8 11h6M11 8v6" stroke="currentColor" stroke-width="1.1" />
          </svg>
          <div class="font-serif text-[15.5px] italic text-navy-900">{{ t('nosotros.analisisPlaceholderTitle') }}</div>
          <p class="max-w-[520px] text-[13.3px] leading-[1.7] text-navy-700 opacity-85">
            {{ t('nosotros.analisisPlaceholderDesc') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
