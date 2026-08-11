<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CategorySummary } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { categoryLabel } from '@/utils/categoryLabel'
import { variableLabel } from '@/utils/variableLabel'
import { formatRange } from '@/utils/formatRange'
import { iconForCategory, iconColorForCategory } from '@/utils/categoryIcon'

defineProps<{ categories: CategorySummary[] }>()

const { t, locale } = useI18n()
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
                <span class="inline-flex items-center gap-1.5">
                  <component
                    :is="iconForCategory(category.categoria)"
                    class="h-3.5 w-3.5 shrink-0"
                    :class="iconColorForCategory(category.categoria)"
                    aria-hidden="true"
                  />
                  {{ categoryLabel(category.categoria, locale as Locale) }}
                </span>
              </td>
            </tr>
            <tr v-for="v in category.variables" :key="v.definitionId" class="border-t border-line">
              <!-- Borde izquierdo por fila (mismo lenguaje que SummaryCard.vue):
               detecta el estado de reojo sin depender del badge de la última columna. -->
              <td class="border-l-4 px-4 py-3 text-navy-900" :class="SEMAPHORE_STYLES[resolveDisplayStatus(v)].accent">
                {{ variableLabel(v.codigo, v.nombre, locale as Locale) }}
                <span class="block text-xs text-navy-700 opacity-60">{{ v.normativaRef }}</span>
              </td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">{{ v.promedio }} {{ v.unidadMedida }}</td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-700">
                {{ formatRange(v.limiteMin, v.limiteMax) }}
              </td>
              <td class="px-4 py-3 font-mono tabular-nums text-navy-900">
                <span v-if="resolveDisplayStatus(v) === 'SIN_NORMA'" class="text-navy-700/50">—</span>
                <span v-else>{{ v.cumplimientoPct }}%</span>
              </td>
              <td class="px-4 py-3">
                <!-- Punto + texto discreto, no un pill grande — mismo motivo
                 que SummaryCard.vue: menos ruido con muchas filas repetidas,
                 y el estado nunca depende solo del color. -->
                <span
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase"
                  :class="SEMAPHORE_STYLES[resolveDisplayStatus(v)].text"
                >
                  <span
                    :class="SEMAPHORE_STYLES[resolveDisplayStatus(v)].dot"
                    class="h-1.5 w-1.5 shrink-0 rounded-full"
                  />
                  {{ t(SEMAPHORE_LABEL_KEY[resolveDisplayStatus(v)]) }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
