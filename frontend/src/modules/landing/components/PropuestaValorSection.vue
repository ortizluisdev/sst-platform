<script setup lang="ts">
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'

const cardClasses =
  'relative border-l border-line-strong pt-2 text-center first:border-l-0 max-[900px]:odd:border-l-0 max-[560px]:border-l-0 max-[560px]:border-t max-[560px]:border-line-strong max-[560px]:pt-9 max-[560px]:first:border-t-0 max-[560px]:first:pt-0 px-5 sm:px-7 md:px-9'
</script>

<template>
  <section id="propuesta-valor" class="relative overflow-hidden px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <component :is="AnimatedNetworkBackgroundAsync" />

    <div class="relative z-[2] mx-auto max-w-[1240px]">
      <div class="mx-auto mb-[72px] max-w-[640px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          Nuestros pilares
        </div>
        <h2 class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900">
          Cuatro convicciones detrás de <em class="font-medium italic text-sky-400">cada</em> diagnóstico.
        </h2>
      </div>

      <div class="grid grid-cols-4 max-[900px]:grid-cols-2 max-[900px]:gap-y-14 max-[560px]:grid-cols-1 max-[560px]:gap-y-12">
        <!-- R -->
        <article :class="cardClasses" class="group">
          <div class="relative mx-auto mb-[22px] h-16 w-16">
            <span class="relative z-[2] font-serif text-[40px] font-semibold text-navy-900 transition-colors duration-300 group-hover:text-sky-400">R</span>
            <svg class="absolute inset-0 z-[1] h-full w-full scale-[.85] opacity-0 transition-all duration-[350ms] group-hover:scale-100 group-hover:opacity-100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="10" r="2.4" fill="#5B8DC7" />
              <circle cx="12" cy="40" r="2.4" fill="#5B8DC7" />
              <circle cx="52" cy="40" r="2.4" fill="#5B8DC7" />
              <circle cx="32" cy="56" r="1.8" fill="#AFC9E8" />
              <line x1="32" y1="10" x2="12" y2="40" stroke="#5B8DC7" stroke-width="0.8" opacity="0.6" />
              <line x1="32" y1="10" x2="52" y2="40" stroke="#5B8DC7" stroke-width="0.8" opacity="0.6" />
              <line x1="12" y1="40" x2="52" y2="40" stroke="#5B8DC7" stroke-width="0.8" opacity="0.35" />
              <line x1="12" y1="40" x2="32" y2="56" stroke="#5B8DC7" stroke-width="0.8" opacity="0.5" />
              <line x1="52" y1="40" x2="32" y2="56" stroke="#5B8DC7" stroke-width="0.8" opacity="0.5" />
            </svg>
          </div>
          <h3 class="mb-[18px] text-[14.5px] font-semibold uppercase leading-snug tracking-[0.03em] text-navy-900">Ciencia de la Complejidad</h3>
          <p class="mb-3.5 font-serif text-[15.5px] font-medium italic leading-snug text-sky-400">Comprender el riesgo antes de intervenirlo.</p>
          <p class="text-[13.5px] leading-relaxed text-navy-700">
            Aplicamos ciencia de la complejidad para modelar la interacción entre personas, procesos, tecnologías y
            entorno, fortaleciendo decisiones basadas en evidencia.
          </p>
        </article>

        <!-- O -->
        <article :class="cardClasses" class="group">
          <div class="relative mx-auto mb-[22px] h-16 w-16">
            <span class="relative z-[2] font-serif text-[40px] font-semibold text-navy-900 transition-colors duration-300 group-hover:text-sky-400">O</span>
            <svg class="absolute inset-0 z-[1] h-full w-full scale-[.85] opacity-0 transition-all duration-[350ms] group-hover:scale-100 group-hover:opacity-100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="14" r="2.2" fill="#5B8DC7" />
              <circle cx="52" cy="14" r="2.2" fill="#5B8DC7" />
              <circle cx="8" cy="50" r="2" fill="#AFC9E8" />
              <circle cx="56" cy="50" r="2" fill="#AFC9E8" />
              <line x1="12" y1="14" x2="52" y2="14" stroke="#5B8DC7" stroke-width="0.8" opacity="0.5" />
              <line x1="12" y1="14" x2="8" y2="50" stroke="#5B8DC7" stroke-width="0.8" opacity="0.5" />
              <line x1="52" y1="14" x2="56" y2="50" stroke="#5B8DC7" stroke-width="0.8" opacity="0.5" />
              <line x1="8" y1="50" x2="56" y2="50" stroke="#5B8DC7" stroke-width="0.8" opacity="0.35" />
            </svg>
          </div>
          <h3 class="mb-[18px] text-[14.5px] font-semibold uppercase leading-snug tracking-[0.03em] text-navy-900">Experiencia que comprende su negocio</h3>
          <p class="mb-3.5 font-serif text-[15.5px] font-medium italic leading-snug text-sky-400">Cada organización es un sistema único.</p>
          <p class="text-[13.5px] leading-relaxed text-navy-700">
            Nuestra experiencia asesorando empresas de los principales sectores económicos de Colombia nos permite
            diseñar soluciones alineadas con la realidad de cada organización.
          </p>
        </article>

        <!-- M -->
        <article :class="cardClasses" class="group">
          <div class="relative mx-auto mb-[22px] h-16 w-16">
            <span class="relative z-[2] font-serif text-[40px] font-semibold text-navy-900 transition-colors duration-300 group-hover:text-sky-400">M</span>
            <svg class="absolute inset-0 z-[1] h-full w-full scale-[.85] opacity-0 transition-all duration-[350ms] group-hover:scale-100 group-hover:opacity-100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="46" r="2.2" fill="#5B8DC7" />
              <circle cx="24" cy="20" r="2" fill="#AFC9E8" />
              <circle cx="40" cy="20" r="2" fill="#AFC9E8" />
              <circle cx="54" cy="46" r="2.2" fill="#5B8DC7" />
              <line x1="10" y1="46" x2="24" y2="20" stroke="#5B8DC7" stroke-width="0.8" opacity="0.55" />
              <line x1="24" y1="20" x2="40" y2="20" stroke="#5B8DC7" stroke-width="0.8" opacity="0.4" />
              <line x1="40" y1="20" x2="54" y2="46" stroke="#5B8DC7" stroke-width="0.8" opacity="0.55" />
              <line x1="10" y1="46" x2="54" y2="46" stroke="#5B8DC7" stroke-width="0.8" opacity="0.3" />
            </svg>
          </div>
          <h3 class="mb-[18px] text-[14.5px] font-semibold uppercase leading-snug tracking-[0.03em] text-navy-900">Seguridad que genera valor</h3>
          <p class="mb-3.5 font-serif text-[15.5px] font-medium italic leading-snug text-sky-400">La gestión del riesgo debe impulsar el negocio, no limitarlo.</p>
          <p class="text-[13.5px] leading-relaxed text-navy-700">
            Integramos la seguridad con la productividad, la continuidad del negocio y la excelencia operacional,
            demostrando que proteger a las personas fortalece el desempeño.
          </p>
        </article>

        <!-- A -->
        <article :class="cardClasses" class="group">
          <div class="relative mx-auto mb-[22px] h-16 w-16">
            <span class="relative z-[2] font-serif text-[40px] font-semibold text-navy-900 transition-colors duration-300 group-hover:text-sky-400">A</span>
            <svg class="absolute inset-0 z-[1] h-full w-full scale-[.85] opacity-0 transition-all duration-[350ms] group-hover:scale-100 group-hover:opacity-100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="8" r="2.4" fill="#5B8DC7" />
              <circle cx="14" cy="50" r="2" fill="#AFC9E8" />
              <circle cx="50" cy="50" r="2" fill="#AFC9E8" />
              <line x1="32" y1="8" x2="14" y2="50" stroke="#5B8DC7" stroke-width="0.8" opacity="0.6" />
              <line x1="32" y1="8" x2="50" y2="50" stroke="#5B8DC7" stroke-width="0.8" opacity="0.6" />
              <line x1="22" y1="34" x2="42" y2="34" stroke="#5B8DC7" stroke-width="0.8" opacity="0.45" />
            </svg>
          </div>
          <h3 class="mb-[18px] text-[14.5px] font-semibold uppercase leading-snug tracking-[0.03em] text-navy-900">Nuestra filosofía</h3>
          <p class="mb-3.5 font-serif text-[15.5px] font-medium italic leading-snug text-sky-400">Proteger la vida es el propósito. Todo lo demás es consecuencia.</p>
          <p class="text-[13.5px] leading-relaxed text-navy-700">
            Creemos que ninguna lesión, enfermedad laboral o pérdida humana es aceptable. Nuestra razón de ser es
            que las personas regresen a casa sanas y seguras cada día.
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
