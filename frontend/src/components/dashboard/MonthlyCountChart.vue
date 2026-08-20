<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import type { MonthlyRegistrationCount } from '@/utils/adminDashboardStats'
import { CHART_PALETTE, CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'
import type { Locale } from '@/i18n'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ data: MonthlyRegistrationCount[] }>()
const { locale } = useI18n()

/** 'YYYY-MM' → "ago 2026" / "Aug 2026" — `timeZone: 'UTC'` fijo para que el
 * mes mostrado no dependa de la zona horaria del navegador, mismo motivo
 * por el que computeMonthlyRegistrations trabaja en UTC (ver adminDashboardStats.ts). */
function monthLabel(label: string): string {
  const date = new Date(`${label}-01T00:00:00Z`)
  return new Intl.DateTimeFormat(locale.value as Locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  )
}

const chartData = computed(() => ({
  labels: props.data.map((point) => monthLabel(point.label)),
  datasets: [
    {
      data: props.data.map((point) => point.count),
      backgroundColor: CHART_PALETTE.sky400,
      borderRadius: 4,
      maxBarThickness: 40,
    },
  ],
}))

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: CHART_TOOLTIP_STYLE,
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: CHART_PALETTE.navy700 } },
    // stepSize: 1 — los conteos son enteros pequeños, sin esto Chart.js
    // podía elegir marcas fraccionarias ("1.5 clientes") en el eje Y.
    y: { beginAtZero: true, ticks: { stepSize: 1, color: CHART_PALETTE.navy700 }, grid: { color: CHART_PALETTE.line } },
  },
}
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-4 sm:p-5">
    <div class="h-48 sm:h-56">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
