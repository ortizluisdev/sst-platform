<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'

ChartJS.register(ArcElement, Tooltip)

export interface DonutSlice {
  label: string
  value: number
  /** Hex — Chart.js no acepta clases de Tailwind, necesita el string literal. */
  color: string
}

const props = defineProps<{ slices: DonutSlice[] }>()
const { t } = useI18n()

const total = computed(() => props.slices.reduce((sum, slice) => sum + slice.value, 0))
/** Sin datos, un donut vacío (todas las porciones en 0) se lee como "algo
 * falló" en vez de "todavía no hay nada que mostrar" — mismo criterio que
 * ComplianceRing.vue. */
const hasData = computed(() => total.value > 0)

const chartData = computed(() => ({
  labels: props.slices.map((slice) => slice.label),
  datasets: [
    {
      data: props.slices.map((slice) => slice.value),
      backgroundColor: props.slices.map((slice) => slice.color),
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
  <div class="rounded-lg border border-line-strong bg-white p-3">
    <div class="relative mx-auto h-[100px] w-[100px]">
      <div class="absolute inset-3 rounded-full bg-navy-900/[0.03] blur-md" aria-hidden="true" />
      <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full w-full rounded-full border-[10px] border-line-strong" />
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span v-if="hasData" class="font-serif text-2xl font-semibold text-navy-900">{{ total }}</span>
        <span v-else class="font-serif text-sm font-semibold text-navy-700 opacity-70">{{
          t('dashboard.complianceRing.noData')
        }}</span>
      </div>
    </div>
    <ul v-if="hasData" class="mt-2 flex flex-col gap-1 text-[11px]">
      <li v-for="slice in slices" :key="slice.label" class="flex items-center justify-between gap-2">
        <span class="flex min-w-0 items-center gap-1.5 truncate text-navy-700">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full" :style="{ backgroundColor: slice.color }" aria-hidden="true" />
          <span class="truncate">{{ slice.label }}</span>
        </span>
        <span class="shrink-0 font-semibold text-navy-900">{{ slice.value }}</span>
      </li>
    </ul>
  </div>
</template>
