<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { GlobalCompliance } from '@/types/dashboard'
import { SEMAPHORE_HEX } from '@/utils/semaphoreStyles'
import { CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'
import { roundDisplay } from '@/utils/formatNumber'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  compliance: GlobalCompliance
  /** Oculta el título interno de la tarjeta (2026-08, DashboardRiskSections.vue
   * lo pone AFUERA en vez de adentro, igual que el resto de los títulos de
   * sección junto a los que va — "Comparativo vs. Norma", etc. — quedaban
   * desalineados: este título interno empujaba el anillo hacia abajo unos
   * px de más comparado con las tablas vecinas). Sin esta prop, se ve
   * exactamente igual que siempre — RoadSafetyDashboardTab.vue/ReportesTab.vue
   * nunca la pasan. */
  hideTitle?: boolean
  /** Anillo/leyenda más chicos (2026-08, "que quepa todo sin scroll" en el
   * dashboard general de admin) — sin esta prop, se ve exactamente igual
   * que siempre; RoadSafetyDashboardTab.vue/ReportesTab.vue nunca la pasan. */
  compact?: boolean
}>()
const { t } = useI18n()

/** Sin ninguna lectura cargada todavía, un donut al 0% se lee como "todo
 * falló" en vez de "no hay datos" — mostramos un estado neutro en su lugar. */
const hasData = computed(() => props.compliance.total > 0)

const chartData = computed(() => ({
  labels: [t('dashboard.semaphore.cumple'), t('dashboard.semaphore.alerta'), t('dashboard.semaphore.critico')],
  datasets: [
    {
      data: [props.compliance.verde, props.compliance.amarillo, props.compliance.rojo],
      backgroundColor: [SEMAPHORE_HEX.VERDE, SEMAPHORE_HEX.AMARILLO, SEMAPHORE_HEX.ROJO],
      borderWidth: 0,
      borderRadius: 6,
      spacing: 3,
    },
  ],
}))

const chartOptions = {
  cutout: '72%',
  maintainAspectRatio: false,
  animation: { animateRotate: true, duration: 700, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...CHART_TOOLTIP_STYLE,
      callbacks: { label: (ctx: { label: string; parsed: number }) => ` ${ctx.label}: ${ctx.parsed}` },
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white" :class="compact ? 'p-3' : 'p-4 sm:p-5'">
    <p v-if="!hideTitle" class="mb-4 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
      {{ t('dashboard.complianceRing.title') }}
    </p>
    <div
      class="relative mx-auto"
      :class="compact ? 'h-[100px] w-[100px]' : 'h-[150px] w-[150px] sm:h-[170px] sm:w-[170px]'"
    >
      <!-- Sombra suave detrás del anillo — antes quedaba plano contra la
       tarjeta blanca, esto le da un poco de profundidad sin agregar un
       color nuevo. -->
      <div class="absolute inset-3 rounded-full bg-navy-900/[0.03] blur-md" aria-hidden="true" />
      <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full w-full rounded-full border-[10px] border-line-strong" />
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span v-if="hasData" class="font-serif font-semibold text-navy-900" :class="compact ? 'text-2xl' : 'text-4xl'">{{
          roundDisplay(compliance.pct)
        }}%</span>
        <span v-else class="font-serif text-lg font-semibold text-navy-700 opacity-70">{{ t('dashboard.complianceRing.noData') }}</span>
        <span
          v-if="hasData && !compact"
          class="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-navy-700/70"
          >{{ t('dashboard.complianceRing.centerLabel') }}</span
        >
      </div>
    </div>
    <!-- Leyenda como pills con fondo tenue (mismo tono pastel que
     SEMAPHORE_STYLES usa en el resto del dashboard, no un color nuevo) en
     vez de solo texto + punto — se lee más como parte del mismo lenguaje
     visual de tarjetas/badges que el resto de la app, y separa mejor las 3
     cifras entre sí. -->
    <div v-if="hasData" class="grid grid-cols-3 gap-2 text-center text-xs" :class="compact ? 'mt-2' : 'mt-4'">
      <div class="rounded-lg border border-emerald-100 bg-emerald-50 px-1.5" :class="compact ? 'py-1' : 'py-2'">
        <p class="flex items-center justify-center gap-1.5 font-semibold text-emerald-600">
          <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          {{ compliance.verde }}
        </p>
        <p v-if="!compact" class="mt-0.5 text-emerald-700/70">{{ t('dashboard.semaphore.cumple') }}</p>
      </div>
      <div class="rounded-lg border border-amber-100 bg-amber-50 px-1.5" :class="compact ? 'py-1' : 'py-2'">
        <p class="flex items-center justify-center gap-1.5 font-semibold text-amber-600">
          <span class="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          {{ compliance.amarillo }}
        </p>
        <p v-if="!compact" class="mt-0.5 text-amber-700/70">{{ t('dashboard.semaphore.alerta') }}</p>
      </div>
      <div class="rounded-lg border border-red-100 bg-red-50 px-1.5" :class="compact ? 'py-1' : 'py-2'">
        <p class="flex items-center justify-center gap-1.5 font-semibold text-red-600">
          <span class="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
          {{ compliance.rojo }}
        </p>
        <p v-if="!compact" class="mt-0.5 text-red-700/70">{{ t('dashboard.semaphore.critico') }}</p>
      </div>
    </div>
  </div>
</template>
