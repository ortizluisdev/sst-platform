<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ScriptableContext,
} from 'chart.js'
import type { Component } from 'vue'
import type { TrendPoint } from '@/types/dashboard'
import { CHART_PALETTE, CHART_SKY_RGBA, CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps<{
  titulo: string
  unidadMedida: string
  /** Código de VariableDefinition a graficar (ej. "ILU-01") — una variable
   * representativa por categoría, no un promedio entre unidades distintas. */
  codigo: string
  trend: TrendPoint[]
  /** Ícono opcional junto al título (2026-08, "colocale más colorcitos" en
   * ClientAnalisisTab.vue) — sin esta prop, la tarjeta se ve exactamente
   * igual que siempre; CategoryTab.vue (admin) nunca la pasa. */
  icon?: Component
  /** Clase Tailwind de color para el ícono (ej. "text-amber-500") — junto
   * con `icon`, nunca sola. */
  iconColorClass?: string
}>()

/** Relleno en degradado sutil bajo la línea — Chart.js necesita el
 * canvas ya medido (chartArea) para construir el gradiente, por eso es una
 * función y no un color fijo. */
function areaGradient(context: ScriptableContext<'line'>) {
  const { chart } = context
  const { ctx, chartArea } = chart
  if (!chartArea) return CHART_SKY_RGBA(0)
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, CHART_SKY_RGBA(0.25))
  gradient.addColorStop(1, CHART_SKY_RGBA(0))
  return gradient
}

const chartData = computed(() => ({
  labels: props.trend.map((t) => t.fecha),
  datasets: [
    {
      label: props.titulo,
      data: props.trend.map((t) => t.promedios[props.codigo] ?? null),
      borderColor: CHART_PALETTE.sky400,
      pointBackgroundColor: CHART_PALETTE.sky400,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1.5,
      backgroundColor: areaGradient,
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
  ],
}))

const chartOptions = {
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: CHART_TOOLTIP_STYLE,
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { autoSkip: true, maxRotation: 0, color: CHART_PALETTE.navy700 },
    },
    y: {
      title: { display: true, text: props.unidadMedida, color: CHART_PALETTE.navy700 },
      grid: { color: CHART_PALETTE.line, drawTicks: false },
      ticks: { color: CHART_PALETTE.navy700 },
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-4 sm:p-5">
    <div class="mb-4 flex items-center gap-2">
      <component v-if="icon" :is="icon" class="h-4 w-4 shrink-0" :class="iconColorClass ?? 'text-sky-400'" aria-hidden="true" />
      <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ titulo }}</p>
    </div>
    <div class="h-[180px] w-full sm:h-[200px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
