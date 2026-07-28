<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { GlobalCompliance } from '@/types/dashboard'
import { SEMAPHORE_HEX } from '@/utils/semaphoreStyles'
import { CHART_TOOLTIP_STYLE } from '@/utils/chartTheme'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ compliance: GlobalCompliance }>()
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
  cutout: '78%',
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
  <div class="rounded-lg border border-line-strong bg-white p-4 sm:p-5">
    <p class="mb-4 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
      {{ t('dashboard.complianceRing.title') }}
    </p>
    <div class="relative mx-auto h-[140px] w-[140px] sm:h-[160px] sm:w-[160px]">
      <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full w-full rounded-full border-[10px] border-line-strong" />
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span v-if="hasData" class="font-serif text-3xl font-semibold text-navy-900">{{ compliance.pct }}%</span>
        <span v-else class="font-serif text-lg font-semibold text-navy-700 opacity-70">{{ t('dashboard.complianceRing.noData') }}</span>
        <span v-if="hasData" class="text-[11px] font-medium text-navy-700">{{ t('dashboard.complianceRing.centerLabel') }}</span>
      </div>
    </div>
    <div v-if="hasData" class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
      <div>
        <p class="font-semibold text-emerald-600">{{ compliance.verde }}</p>
        <p class="text-navy-700 opacity-70">{{ t('dashboard.semaphore.cumple') }}</p>
      </div>
      <div>
        <p class="font-semibold text-amber-600">{{ compliance.amarillo }}</p>
        <p class="text-navy-700 opacity-70">{{ t('dashboard.semaphore.alerta') }}</p>
      </div>
      <div>
        <p class="font-semibold text-red-600">{{ compliance.rojo }}</p>
        <p class="text-navy-700 opacity-70">{{ t('dashboard.semaphore.critico') }}</p>
      </div>
    </div>
  </div>
</template>
