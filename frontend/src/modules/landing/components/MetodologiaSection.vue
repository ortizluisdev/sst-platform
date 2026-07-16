<script setup lang="ts">
import { AnimatedNetworkBackgroundAsync } from '@/components/shared/AnimatedNetworkBackground.async'
import AccordionPanel, { type AccordionItem } from '@/components/ui/AccordionPanel.vue'

interface CycleStage extends AccordionItem {
  description: string
  frequency: string
}

const compCards = [
  {
    title: 'Agentes',
    description: 'Las personas: capacidades, estado fisiológico, cognitivo y psicosocial, conducta interna y externa, interacción social.',
    icon: `<svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="23" cy="15" r="7" stroke="#1E3A66" stroke-width="1.6"/><path d="M9 38c1.5-8 7-12 14-12s12.5 4 14 12" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  },
  {
    title: 'Condiciones',
    description: 'El entorno de trabajo: tecnologías, procesos, factores organizacionales, infraestructura física y entorno externo.',
    icon: `<svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="10" width="30" height="26" rx="2" stroke="#1E3A66" stroke-width="1.6"/><path d="M8 18h30M16 10v-4M30 10v-4" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  },
  {
    title: 'Eventos',
    description: 'Nodos-tipo emergentes por mecanismo de daño: caídas, atrapamiento, sobreesfuerzo, exposición química y más.',
    icon: `<svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23 5l5 14h14l-11.3 8.6L35 42 23 32.4 11 42l4.3-14.4L4 19h14z" stroke="#1E3A66" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  },
  {
    title: 'Consecuencias',
    description: 'Severidad esperada, calibrada con datos históricos de accidentalidad en lugar de una tabla fija y subjetiva.',
    icon: `<svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 34l9-12 7 8 14-18" stroke="#1E3A66" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 10h8v8" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
]

const cycleStages: CycleStage[] = [
  {
    id: 'identificacion',
    num: '01',
    label: 'Identificación',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" stroke="#1E3A66" stroke-width="1.5"/><circle cx="32" cy="16" r="4" stroke="#1E3A66" stroke-width="1.5"/><circle cx="24" cy="32" r="4" stroke="#5B8DC7" stroke-width="1.5"/><path d="M19.5 18.5L28.5 18.5M18 19.5L22 29M30 19.5L26 29" stroke="#5B8DC7" stroke-width="1.2" opacity="0.7"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="19" r="4.6" stroke="#1E3A66" stroke-width="1.7"/><circle cx="37" cy="19" r="4.6" stroke="#1E3A66" stroke-width="1.7"/><circle cx="28" cy="37" r="4.6" stroke="#5B8DC7" stroke-width="1.7"/><path d="M22.5 22L33.5 22M21 23L26 33M31 23L26 33" stroke="#5B8DC7" stroke-width="1.4" opacity="0.7"/></svg>`,
    title: 'Identificación',
    tagline: 'Construir y actualizar la estructura de la red.',
    description:
      'Se definen qué nodos existen —agentes, condiciones, eventos— y qué conexiones hay entre ellos. Es la etapa de menor frecuencia: se revisa cuando cambian los procesos, la tecnología, o cuando aparece evidencia nueva sobre interacciones no consideradas previamente.',
    frequency: 'baja — solo cuando cambia la estructura del sistema de trabajo.',
  },
  {
    id: 'valoracion',
    num: '02',
    label: 'Valoración',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 34V22M18 34V14M28 34V26M38 34V10" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 40V26M22 40V17M34 40V30M46 40V12" stroke="#5B8DC7" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    title: 'Valoración',
    tagline: 'Calcular el nivel de riesgo en tiempo real.',
    description:
      'Se combina probabilidad y consecuencia de cada nodo-evento en un instante determinado. A diferencia de la GTC 45, esta valoración no se realiza una vez al año: se recalcula de forma continua a medida que cambian los valores de los nodos fuente —turno a turno o de forma diaria.',
    frequency: 'continua — turno a turno o diaria.',
  },
  {
    id: 'evaluacion',
    num: '03',
    label: 'Evaluación',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="15" stroke="#1E3A66" stroke-width="1.5"/><path d="M18 24l4 4 8-8" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="18" stroke="#1E3A66" stroke-width="1.7"/><path d="M20 28l5 5 11-11" stroke="#5B8DC7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    title: 'Evaluación',
    tagline: 'Priorizar qué eventos requieren intervención.',
    description:
      'El nivel de riesgo calculado se compara frente a bandas de aceptabilidad —aceptable, tolerable, no aceptable, inaceptable— para determinar cuáles eventos requieren intervención prioritaria en un momento dado.',
    frequency: 'puntual — cada vez que se recalcula la valoración.',
  },
  {
    id: 'control',
    num: '04',
    label: 'Control',
    iconMini: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="5" stroke="#1E3A66" stroke-width="1.5"/><path d="M24 11v4M24 33v4M37 24h-4M15 24h-4M33 15l-2.8 2.8M17.8 30.2L15 33M33 33l-2.8-2.8M17.8 17.8L15 15" stroke="#5B8DC7" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    iconBig: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="6" stroke="#1E3A66" stroke-width="1.7"/><path d="M28 13v5M28 38v5M43 28h-5M18 28h-5M38.5 17.5l-3.5 3.5M20.9 35.1L17.4 38.6M38.5 38.6l-3.5-3.5M20.9 20.9L17.4 17.4" stroke="#5B8DC7" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    title: 'Control',
    tagline: 'Intervenir donde el análisis de sensibilidad lo indica.',
    description:
      'Se aplican intervenciones dirigidas específicamente a los nodos que, según el análisis de sensibilidad de la red, muestran mayor contribución al riesgo evaluado, y se verifica que la intervención redujo la trayectoria proyectada.',
    frequency: 'dirigida — al activarse una alerta o al cerrar un ciclo de mejora.',
  },
]

const tools = [
  {
    name: 'Análisis de centralidad de redes',
    fn: 'Identifica los nodos estructuralmente más críticos, independientemente del valor puntual que tomen en un momento dado.',
    freq: 'Baja — cuando cambia la estructura de la red',
  },
  {
    name: 'Modelo de espacio de estados',
    fn: 'Proyecta la evolución del nivel de riesgo de cada nodo en el tiempo y permite simular el efecto de intervenciones.',
    freq: 'Continua — turno a turno / diaria',
  },
  {
    name: 'Redes Bayesianas Dinámicas',
    fn: 'Diagnostica, cuando un evento cruza el umbral crítico, qué nodo o combinación de nodos tuvo mayor contribución.',
    freq: 'Puntual — al activarse una alerta',
  },
  {
    name: 'Función Noisy-OR',
    fn: 'Agrega los nodos hoja dentro de cada sub-hub sin diluir el efecto de un nodo individualmente grave.',
    freq: 'Cada vez que se recalcula un sub-hub',
  },
]
</script>

<template>
  <section id="metodologia" class="relative overflow-hidden bg-cream px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <component :is="AnimatedNetworkBackgroundAsync" />

    <div class="relative z-[2] mx-auto max-w-[1280px]">
      <div class="mx-auto mb-7 max-w-[720px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          Nuestra metodología
        </div>
        <h2 class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900">
          De la matriz estática a la <em class="font-medium italic text-sky-400">red dinámica</em> del riesgo.
        </h2>
        <p class="mt-[18px] text-[15px] leading-[1.7] text-navy-700 opacity-85">
          La GTC 45 organiza los peligros en columnas independientes, cada una con su propio plan de trabajo. En la
          práctica, los peligros coexisten e interactúan: la evidencia sobre trastornos musculoesqueléticos y sobre
          modelos sistémicos de accidentalidad muestra que el riesgo emerge de esa interacción, no de la suma de
          partes aisladas. Por eso adoptamos la ISO 31000 como marco y la ciencia de redes como motor de cálculo.
        </p>
      </div>

      <!-- shift statement -->
      <div class="mx-auto my-14 mb-[88px] grid max-w-[920px] items-center gap-6 rounded-md border border-line-strong bg-white p-8 shadow-[0_24px_60px_rgba(11,26,51,0.06)] max-[720px]:grid-cols-1 min-[721px]:grid-cols-[1fr_auto_1fr] min-[721px]:gap-9">
        <div class="text-center">
          <span class="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-700 opacity-60">Modelo tradicional</span>
          <div class="mb-2 font-serif text-lg font-semibold text-navy-700 opacity-65">Matriz de riesgo estática</div>
          <p class="text-[13px] leading-relaxed text-navy-700 opacity-85">
            Un valor fijo por peligro, revalorado una vez al año, con siete categorías gestionadas en columnas
            separadas.
          </p>
        </div>
        <div class="flex items-center justify-center text-sky-400 max-[720px]:mx-auto max-[720px]:rotate-90">
          <svg class="h-[34px] w-[34px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="text-center">
          <span class="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-700 opacity-60">Modelo RoMa</span>
          <div class="mb-2 font-serif text-lg font-semibold text-navy-900">Red dinámica de riesgo</div>
          <p class="text-[13px] leading-relaxed text-navy-700 opacity-85">
            Agentes y Condiciones interactúan de forma continua; el nivel de riesgo se recalcula con el estado real
            del sistema.
          </p>
        </div>
      </div>

      <p class="mb-8 text-center text-xs uppercase tracking-[0.2em] font-semibold text-navy-700 opacity-60">
        Los cuatro componentes del modelo, según ISO 31000
      </p>
      <div class="mb-[100px] grid grid-cols-4 border-y border-line-strong max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        <article
          v-for="card in compCards"
          :key="card.title"
          class="border-l border-line-strong px-5 py-8 text-center first:border-l-0 max-[900px]:border-t max-[900px]:[&:nth-child(-n+2)]:border-t-0 max-[900px]:odd:border-l-0 max-[560px]:border-l-0 max-[560px]:first:border-t-0"
        >
          <div class="mx-auto mb-[18px] h-[46px] w-[46px] [&>svg]:block [&>svg]:h-full [&>svg]:w-full" v-html="card.icon" />
          <h3 class="mb-2.5 text-sm font-semibold text-navy-900">{{ card.title }}</h3>
          <p class="text-[12.5px] leading-relaxed text-navy-700 opacity-85">{{ card.description }}</p>
        </article>
      </div>

      <div class="mx-auto mb-12 max-w-[680px] text-center">
        <h3 class="mb-3.5 font-serif text-[clamp(22px,2.6vw,30px)] font-semibold text-navy-900">
          Un ciclo continuo, no un ejercicio anual.
        </h3>
        <p class="text-[14.5px] leading-[1.7] text-navy-700 opacity-85">
          Las cuatro etapas reconocidas por la GTC 45 y la ISO 31000 se conservan, pero se ejecutan sobre la red
          dinámica: cada una con su propia frecuencia de actualización.
        </p>
      </div>

      <div class="mb-[110px]">
        <AccordionPanel :items="cycleStages">
          <template #content="{ item }">
            <p class="mb-auto max-w-[660px] text-[13.5px] leading-[1.75] text-navy-700">{{ (item as CycleStage).description }}</p>
            <div class="mt-5 border-t border-line-strong pt-4 text-xs tracking-wide text-navy-700 opacity-85">
              <strong class="font-semibold text-navy-900 opacity-100">Frecuencia:</strong> {{ (item as CycleStage).frequency }}
            </div>
          </template>
        </AccordionPanel>
      </div>

      <div class="mx-auto mb-10 max-w-[680px] text-center">
        <h3 class="mb-3.5 font-serif text-[clamp(22px,2.6vw,30px)] font-semibold text-navy-900">
          Las herramientas matemáticas detrás del modelo.
        </h3>
        <p class="text-[14.5px] leading-[1.7] text-navy-700 opacity-85">
          Pensamiento sistémico y ciencia de redes, traducidos en herramientas concretas de cálculo y diagnóstico.
        </p>
      </div>

      <div class="mb-[110px] overflow-x-auto rounded-md border border-line-strong bg-white shadow-[0_24px_60px_rgba(11,26,51,0.06)]">
        <table class="w-full min-w-[560px] border-collapse">
          <thead>
            <tr>
              <th class="border-b border-line-strong bg-sky-100 px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-700">Herramienta</th>
              <th class="border-b border-line-strong bg-sky-100 px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-700">Función en el modelo</th>
              <th class="border-b border-line-strong bg-sky-100 px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-700">Frecuencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tool in tools" :key="tool.name" class="[&:not(:last-child)>td]:border-b [&:not(:last-child)>td]:border-line">
              <td class="whitespace-nowrap px-5 py-5 align-top font-serif text-[13.5px] font-semibold italic text-navy-900">{{ tool.name }}</td>
              <td class="px-5 py-5 align-top text-[13.5px] leading-relaxed text-navy-700">{{ tool.fn }}</td>
              <td class="whitespace-nowrap px-5 py-5 align-top text-xs text-navy-700 opacity-80">{{ tool.freq }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MSSV network explorer — placeholder (interactive explorer not yet delivered) -->
      <div class="mx-auto max-w-[1180px] overflow-hidden rounded-lg border border-line-strong bg-white shadow-[0_30px_70px_rgba(11,26,51,0.1)]">
        <div class="flex flex-wrap items-start justify-between gap-6 border-b border-line-strong px-6 pb-6 pt-9 sm:px-10 md:px-13">
          <div>
            <span class="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400">Modelo en vivo</span>
            <h3 class="mb-2.5 max-w-[520px] font-serif text-[clamp(20px,2.2vw,26px)] font-semibold text-navy-900">Explora la red MSSV</h3>
            <p class="max-w-[560px] text-[13.5px] leading-[1.7] text-navy-700 opacity-85">
              El mapa completo de agentes, condiciones y eventos que alimenta el modelo: cada nodo con su definición
              y el instrumento de medición asociado.
            </p>
          </div>
          <div class="flex flex-col gap-2 whitespace-nowrap text-xs text-navy-700">
            <span class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-sky-400" /> Nodo del modelo</span>
            <span class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-navy-700" /> Conexión estructural</span>
          </div>
        </div>

        <div class="relative flex h-[460px] items-center justify-center bg-[#FAFBFD] px-6 sm:h-[620px]">
          <div class="flex max-w-[420px] flex-col items-center gap-3.5 rounded-lg border border-dashed border-line-strong bg-gradient-to-br from-sky-100 to-white px-6 py-11 text-center">
            <svg class="h-[34px] w-[34px] text-sky-400 opacity-60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.3" />
              <path d="M20.5 20.5l-4.4-4.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
              <path d="M8 11h6M11 8v6" stroke="currentColor" stroke-width="1.1" />
            </svg>
            <div class="font-serif text-[15.5px] italic text-navy-900">Próximamente</div>
            <p class="text-[13.3px] leading-[1.7] text-navy-700 opacity-85">
              El explorador interactivo de la red MSSV está en construcción. Aquí podrás navegar el mapa completo de
              agentes, condiciones y eventos del modelo.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 bg-sky-100 px-6 py-[18px] text-[12.5px] text-navy-700 sm:px-10 md:px-13">
          <span>Red construida en Obsidian a partir del marco teórico del Modelo Sistémico de Seguridad Vial.</span>
        </div>
      </div>
    </div>
  </section>
</template>
