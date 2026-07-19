<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'

const { t } = useI18n()

// Power BI "publicado en la web" que Fasecolda ya embebe en su propio sitio —
// confirmado sin X-Frame-Options ni CSP frame-ancestors, así que se puede
// embeber directo aquí. FASECOLDA_PAGE_URL queda como respaldo visible siempre
// (no solo ante fallo), por si Microsoft/Fasecolda rotan el token del embed.
const FASECOLDA_DASHBOARD_EMBED_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiNzE2Njg3YjUtMjRkNi00N2E5LWJlMDQtZDcwMTcyNjlhNzlkIiwidCI6ImU2NDRiYWFiLThkYmUtNDFkZS1hMmNkLTNlOTU4ODljMGJhZCIsImMiOjR9'
const FASECOLDA_PAGE_URL = 'https://www.fasecolda.com/ramos/riesgos-laborales/rl-datos-dashboard/'
</script>

<template>
  <section
    id="inicio"
    class="relative flex min-h-screen flex-col items-center justify-center gap-14 overflow-hidden px-6 pb-24 pt-[150px]"
  >
    <component
      :is="AnimatedNetworkBackgroundAsync"
      :node-count-desktop="78"
      :node-count-mobile="42"
      :velocity-scale="0.4"
      :radius-min="2.2"
      :radius-max="2.6"
      :repel-radius="240"
      :repel-force="3.4"
      :max-distance="150"
      :connection-alpha="0.3"
      :node-alpha-sky="0.9"
      :node-alpha-navy="0.7"
      :shadow-blur="7"
    />

    <div class="relative z-[2] flex w-full max-w-[1180px] flex-col items-center gap-12 pointer-events-none">
      <div class="pointer-events-auto max-w-[640px] text-center">
        <div
          class="mb-6 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong"
        >
          {{ t('hero.eyebrow') }}
        </div>
        <i18n-t
          keypath="hero.title"
          tag="h1"
          class="mb-4 font-serif text-[clamp(34px,4.6vw,56px)] font-semibold leading-[1.18] tracking-[-0.01em] text-navy-900"
        >
          <template #accent
            ><em class="font-serif font-medium italic text-sky-400">{{ t('hero.titleAccent') }}</em></template
          >
        </i18n-t>
        <p class="mx-auto mb-10 max-w-[480px] text-[clamp(15px,1.4vw,17px)] leading-relaxed text-navy-700">
          {{ t('hero.lead') }}
        </p>

        <div class="flex flex-wrap justify-center gap-4">
          <a
            href="#servicios"
            class="inline-flex items-center gap-2 rounded-sm border border-navy-900 bg-navy-900 px-7 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-250 hover:bg-transparent hover:text-navy-900"
          >
            {{ t('hero.ctaSecondary') }}
          </a>
        </div>
      </div>

      <!-- Contexto del riesgo: tarjeta horizontal con el dashboard oficial de Fasecolda -->
      <div
        class="pointer-events-auto w-full rounded-lg border border-line-strong bg-white/80 p-6 shadow-[0_20px_50px_rgba(11,26,51,0.08)] backdrop-blur-sm sm:p-8"
      >
        <div class="grid gap-8 md:grid-cols-[minmax(220px,300px)_1fr] md:items-center">
          <div class="flex flex-col gap-3.5 text-center md:text-left">
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">{{
              t('hero.sideCard.kicker')
            }}</span>
            <h3 class="font-serif text-[19px] font-semibold leading-snug text-navy-900">
              {{ t('hero.sideCard.title') }}
            </h3>
            <p class="text-[13px] leading-relaxed text-navy-700">
              {{ t('hero.sideCard.text') }}
            </p>
            <a
              href="https://ccs.org.co/observatorio/Home/fasecolda"
              target="_blank"
              rel="noopener"
              class="mx-auto inline-flex w-fit items-center gap-1.5 border-b border-sky-400 pb-0.5 text-[13px] font-semibold text-navy-900 no-underline transition-colors hover:text-sky-400 md:mx-0"
            >
              {{ t('hero.sideCard.link') }}
            </a>
            <span class="text-[11px] text-navy-700 opacity-75">{{ t('hero.sideCard.source') }}</span>
          </div>

          <div class="flex flex-col gap-2.5">
            <div class="aspect-[1140/700] w-full overflow-hidden rounded-md border border-line-strong bg-sky-100/60">
              <iframe
                :src="FASECOLDA_DASHBOARD_EMBED_URL"
                :title="t('hero.sideCard.dashboardTitle')"
                loading="lazy"
                frameborder="0"
                allowfullscreen
                class="h-full w-full"
              />
            </div>
            <!--
              Enlace de respaldo siempre visible (no solo ante fallo): el
              iframe apunta al Power BI "publicado en la web" que Fasecolda ya
              usa en su propio sitio, sin restricciones de framing hoy, pero si
              Microsoft o Fasecolda rotan el token del embed en el futuro,
              siempre hay una salida directa a la página oficial.
            -->
            <a
              :href="FASECOLDA_PAGE_URL"
              target="_blank"
              rel="noopener"
              class="inline-flex w-fit items-center gap-1.5 self-center text-[12px] font-semibold text-navy-900 no-underline transition-colors hover:text-sky-400 md:self-end"
            >
              {{ t('hero.sideCard.dashboardLink') }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <p
      class="pointer-events-none relative z-[2] flex max-w-[900px] flex-wrap items-center justify-center gap-x-3.5 gap-y-2.5 text-center text-[13.5px] tracking-wide text-navy-700"
    >
      <strong class="font-semibold text-navy-900">{{ t('hero.caption.label') }}</strong>
      {{ t('hero.caption.identification') }} <span class="font-semibold text-sky-500">→</span>
      {{ t('hero.caption.analysis') }} <span class="font-semibold text-sky-500">→</span>
      {{ t('hero.caption.valuation') }}
      <span class="px-0.5 text-line-strong">|</span>
      {{ t('hero.caption.treatment') }}
    </p>
  </section>
</template>
