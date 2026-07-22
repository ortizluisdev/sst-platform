<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CategorySummary } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'
import { categoryLabel } from '@/utils/categoryLabel'

defineProps<{ categories: CategorySummary[] }>()

const { t, locale } = useI18n()

function formatRange(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} – ${max}`
  if (max != null) return `≤ ${max}`
  if (min != null) return `≥ ${min}`
  return '—'
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
    <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
          <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.variable') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.medicion') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.norma') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.pctCumplimiento') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.estado') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="category in categories" :key="category.categoria">
          <tr class="bg-cream">
            <td colspan="5" class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ categoryLabel(category.categoria, locale as Locale) }}
            </td>
          </tr>
          <tr v-for="v in category.variables" :key="v.definitionId" class="border-t border-line">
            <td class="px-4 py-3 text-navy-900">
              {{ v.nombre }}
              <span class="block text-xs text-navy-700 opacity-60">{{ v.normativaRef }}</span>
            </td>
            <td class="px-4 py-3 font-mono text-navy-900">{{ v.promedio }} {{ v.unidadMedida }}</td>
            <td class="px-4 py-3 font-mono text-navy-700">{{ formatRange(v.limiteMin, v.limiteMax) }}</td>
            <td class="px-4 py-3 text-navy-900">{{ v.cumplimientoPct }}%</td>
            <td class="px-4 py-3">
              <span
                :class="[SEMAPHORE_STYLES[v.estado].bg, SEMAPHORE_STYLES[v.estado].text, SEMAPHORE_STYLES[v.estado].border]"
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
              >
                <span :class="SEMAPHORE_STYLES[v.estado].dot" class="h-1.5 w-1.5 rounded-full" />
                {{ t(SEMAPHORE_LABEL_KEY[v.estado]) }}
              </span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    </div>
  </div>
</template>
