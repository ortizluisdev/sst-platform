<script setup lang="ts">
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'
import AccordionPanel, { type AccordionItem } from '@/components/ui/AccordionPanel.vue'

interface ServiceItem extends AccordionItem {
  description: string
  tags: string[]
  techLabel: string
  techText: string
}

const items: ServiceItem[] = [
  {
    id: 'higiene',
    num: '01',
    label: 'Higiene Industrial',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4C24 4 14 16 14 26C14 31.5 18.5 36 24 36C29.5 36 34 31.5 34 26C34 16 24 4 24 4Z" stroke="#1E3A66" stroke-width="1.6"/><circle cx="24" cy="27" r="4.5" stroke="#5B8DC7" stroke-width="1.4"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 5C28 5 16 19 16 30C16 37 21.4 42 28 42C34.6 42 40 37 40 30C40 19 28 5 28 5Z" stroke="#1E3A66" stroke-width="1.8"/><circle cx="28" cy="31" r="5.4" stroke="#5B8DC7" stroke-width="1.6"/></svg>`,
    title: 'Higiene Industrial',
    tagline: 'Un modelo de sistemas para estudiar lo que el ojo no mide.',
    description:
      'Diseñamos e implementamos un <strong>modelo de sistemas de estudios higiénicos</strong> que traduce las condiciones físicas del entorno de trabajo —sonido, luz y temperatura— en información accionable para la gestión. En lugar de una medición puntual y aislada, construimos <strong>mapas de sonido</strong> y <strong>mapas de iluminación</strong> de la operación completa, soportados en sonometrías, luxometrías y evaluaciones de estrés térmico, y los cruzamos con el proceso productivo para priorizar dónde intervenir primero.',
    tags: ['Mapas de Sonido', 'Mapas de Iluminación', 'Estrés Térmico', 'Sonometrías', 'Luxometrías'],
    techLabel: 'Fundamentos técnicos:',
    techText:
      'acústica industrial (Crocker), ergonomía e ingeniería térmica (Parsons, Incropera), confort y estrés térmico (Fanger) e ingeniería de iluminación (Boyce, IES, CIE). Alineado a ISO 7730, ISO 7243, ISO 7933 e ISO 11079.',
  },
  {
    id: 'vial',
    num: '02',
    label: 'Seguridad Vial',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="17" stroke="#1E3A66" stroke-width="1.6"/><path d="M24 14V24L30 28" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="20" stroke="#1E3A66" stroke-width="1.8"/><path d="M28 16V28L35 33" stroke="#5B8DC7" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    title: 'Seguridad Vial',
    tagline: 'Modelo Sistémico de Seguridad Vial: cumplimiento normativo y ciencia del comportamiento, en un solo marco.',
    description:
      'Trabajamos la seguridad vial en dos niveles complementarios. El <strong>PESV clásico</strong>, que responde a la estructura normativa vigente para flotas propias y contratadas. Y un <strong>Modelo Sistémico de Seguridad Vial</strong> propio, que va más allá del cumplimiento documental: mide y modela el riesgo vial real de la operación a partir del comportamiento del conductor, el vehículo y el entorno.',
    tags: ['PESV Clásico', 'Modelo Sistémico de Seguridad Vial'],
    techLabel: 'Fundamentos técnicos:',
    techText:
      'medición y modelación del riesgo vial (Evans — <em>Traffic Safety</em>), ciencia del comportamiento y desempeño del conductor (Evans — <em>Traffic Safety and the Driver</em>) y comprensión sistémica de la accidentalidad en motociclistas basada en evidencia (The Hurt Report).',
  },
  {
    id: 'mecanico',
    num: '03',
    label: 'Riesgo Mecánico y Locativo',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 31L28 20a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0L13 27" stroke="#1E3A66" stroke-width="1.6" stroke-linecap="round"/><path d="M13 27l-3 7 7-3" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 36L33 23a3.5 3.5 0 0 0 0-5 3.5 3.5 0 0 0-5 0L15 31" stroke="#1E3A66" stroke-width="1.8" stroke-linecap="round"/><path d="M15 31l-3.5 8 8-3.5" stroke="#5B8DC7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    title: 'Riesgo Mecánico y Locativo',
    tagline: 'Modelo Sistémico de Intervención: mejora continua aplicada a la operación, las herramientas y la maquinaria.',
    description:
      'Una estrategia que orienta la intervención de los riesgos más representativos derivados de la operación, el uso de herramientas, equipos y maquinaria, en plantas de producción, talleres y operaciones con activos críticos, a través de un proceso sistemático de mejora continua.',
    tags: ['Diagnóstico técnico', 'Priorización', 'Mejora continua'],
    techLabel: 'Modelo de intervención:',
    techText:
      'definición de responsabilidades y alcance → identificación y priorización de áreas, procesos, equipos y actividades críticas → diagnóstico técnico de las condiciones que originan el riesgo → diseño e implementación de medidas sobre personas, equipos y procesos → seguimiento por indicadores de gestión → evaluación y mejora continua de la estrategia.',
  },
  {
    id: 'mantenimiento',
    num: '04',
    label: 'Mantenimiento Basado en Riesgo',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="6" stroke="#1E3A66" stroke-width="1.6"/><path d="M24 12v4M24 32v4M36 24h-4M16 24h-4M32.5 15.5l-2.8 2.8M18.3 29.7l-2.8 2.8M32.5 32.5l-2.8-2.8M18.3 18.3l-2.8-2.8" stroke="#5B8DC7" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="7" stroke="#1E3A66" stroke-width="1.8"/><path d="M28 14v5M28 37v5M42 28h-5M19 28h-5M38 18l-3.5 3.5M21.5 34.5L18 38M38 38l-3.5-3.5M21.5 21.5L18 18" stroke="#5B8DC7" stroke-width="1.7" stroke-linecap="round"/></svg>`,
    title: 'Mantenimiento Basado en Riesgo',
    tagline: 'Modelo Sistémico de Mantenimiento: menos siniestros, más confiabilidad.',
    description:
      'Diseñamos estrategias de mantenimiento basadas en riesgo orientadas a reducir la siniestralidad de la operación, tanto la que afecta a las <strong>personas</strong> como la que compromete la <strong>propiedad y la infraestructura crítica</strong>. Priorizamos la inversión y el esfuerzo técnico según la probabilidad y la consecuencia real de falla de cada activo, integrando confiabilidad operacional con gestión de seguridad de procesos.',
    tags: ['Riesgo de Personas', 'Riesgo de Infraestructura', 'Confiabilidad'],
    techLabel: 'Enfoque:',
    techText: 'análisis de criticidad e inspección basada en riesgo (RBI) y mantenimiento centrado en confiabilidad (RCM), ajustados a la realidad operativa de cada planta.',
  },
  {
    id: 'comportamiento',
    num: '05',
    label: 'Modelado Científico de Comportamiento Social',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="18" r="3.4" stroke="#1E3A66" stroke-width="1.5"/><circle cx="32" cy="18" r="3.4" stroke="#1E3A66" stroke-width="1.5"/><circle cx="24" cy="32" r="3.4" stroke="#5B8DC7" stroke-width="1.5"/><path d="M18.8 20.3L21.6 29M29.2 20.3L26.4 29M19.4 18h9.2" stroke="#5B8DC7" stroke-width="1.3" opacity="0.7"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="21" r="4" stroke="#1E3A66" stroke-width="1.7"/><circle cx="37" cy="21" r="4" stroke="#1E3A66" stroke-width="1.7"/><circle cx="28" cy="37" r="4" stroke="#5B8DC7" stroke-width="1.7"/><path d="M21.8 24.6L25.2 33.6M34.2 24.6L30.8 33.6M22.5 21h11" stroke="#5B8DC7" stroke-width="1.5" opacity="0.7"/></svg>`,
    title: 'Modelado Científico de Comportamiento Social',
    tagline: 'Modelo Sistémico de Comportamiento: entornos fijos y entornos variables.',
    description:
      'Construimos un modelo sistémico que interpreta la conducta humana frente al riesgo a partir de dos fuerzas: los <strong>entornos fijos</strong> —la estructura, las normas y la cultura organizacional— y los <strong>entornos variables</strong> —el contexto, la presión y la oportunidad del momento. Es el mismo marco que usamos para entender por qué las personas se exponen al riesgo en la operación, y que extendemos a fenómenos de conducta organizacional más amplios, como los <strong>modelos de corrupción pública y privada</strong>: otra forma de comportamiento sistémico que también se explica —y se interviene— desde sus entornos fijos y variables.',
    tags: ['Entornos Fijos', 'Entornos Variables', 'Corrupción Pública y Privada'],
    techLabel: 'Enfoque:',
    techText: 'ciencia de la complejidad aplicada al comportamiento humano, integrando variables organizacionales, sociales e individuales en un mismo marco de análisis sistémico.',
  },
]
</script>

<template>
  <section id="servicios" class="relative overflow-hidden bg-cream px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <component :is="AnimatedNetworkBackgroundAsync" />

    <div class="relative z-[2] mx-auto max-w-[1280px]">
      <div v-reveal class="mx-auto mb-16 max-w-[680px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          Lo que hacemos
        </div>
        <h2 class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900">
          Cinco frentes de intervención, <em class="font-medium italic text-sky-400">un mismo método</em> científico.
        </h2>
        <p class="mt-[18px] text-[15px] leading-relaxed text-navy-700 opacity-85">
          Cada servicio combina fundamentos técnicos verificables con un modelo de intervención propio, diseñado
          para transformar datos de campo en decisiones de gestión.
        </p>
      </div>

      <div v-reveal="100">
        <AccordionPanel :items="items">
        <template #content="{ item }">
          <p class="mb-[22px] max-w-[660px] text-sm leading-[1.75] text-navy-700 [&_strong]:font-semibold [&_strong]:text-navy-900" v-html="(item as ServiceItem).description" />
          <div class="mb-auto flex flex-wrap gap-2">
            <span
              v-for="tag in (item as ServiceItem).tags"
              :key="tag"
              class="rounded-full border border-line-strong bg-sky-100 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-navy-700"
            >
              {{ tag }}
            </span>
          </div>
          <div class="mt-6 max-w-[680px] border-t border-line-strong pt-5 text-[12.5px] leading-relaxed text-navy-700 opacity-85 [&_strong]:font-semibold [&_strong]:text-navy-900 [&_strong]:opacity-100">
            <strong>{{ (item as ServiceItem).techLabel }}</strong> <span v-html="(item as ServiceItem).techText" />
          </div>
        </template>
        </AccordionPanel>
      </div>
    </div>
  </section>
</template>
