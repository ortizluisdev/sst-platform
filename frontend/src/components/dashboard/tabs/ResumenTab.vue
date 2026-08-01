<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import SummaryCard from '../SummaryCard.vue'
import ComplianceRing from '../ComplianceRing.vue'
import DashboardRiskSections from '../DashboardRiskSections.vue'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { formatDate } from '@/utils/formatDate'
import { formatSummaryValue } from '@/utils/formatSummaryValue'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { HEADLINE_CODE_POR_CATEGORIA } from '../client/headlineVariables'

const props = defineProps<{ dashboard: DashboardData; organizationId?: string }>()
const { t, locale } = useI18n()

/** Variable representativa (la primera) de cada categoría — resumen de
 * lectura rápida, el detalle completo vive en la pestaña de cada categoría. */
const headlineByCategory = computed(() =>
  props.dashboard.categories.map((c) => ({ categoria: c.categoria, v: c.variables[0] })).filter((x) => x.v),
)

/** Mismo mapeo que el cliente (headlineVariables.ts) — para que "Comparativo
 * vs. norma" muestre exactamente la misma variable de cabecera por categoría
 * en ambas vistas, en vez de "la primera del catálogo" (que puede diferir). */
const headlineCards = computed(() =>
  Object.entries(HEADLINE_CODE_POR_CATEGORIA).map(([categoria, codigo]) => {
    const categoriaData = props.dashboard.categories.find((c) => c.categoria === categoria)
    const variable = categoriaData?.variables.find((v) => v.codigo === codigo)
    return { categoria, variable }
  }),
)

const lastUpdatedLabel = computed(() =>
  props.dashboard.lastUpdated
    ? formatDate(props.dashboard.lastUpdated, locale.value as Locale)
    : t('dashboard.layout.noDataYet'),
)
</script>

<template>
  <div class="grid gap-6">
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-strong bg-white px-5 py-4"
    >
      <div>
        <h1 class="font-serif text-xl font-semibold text-navy-900">
          {{ t('dashboard.resumen.titlePrefix') }}{{ dashboard.service.nombre }}
        </h1>
        <p class="text-xs text-navy-700 opacity-70">
          {{ t('dashboard.resumen.lastUpdatePrefix') }}{{ lastUpdatedLabel }}
        </p>
      </div>
      <span class="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-navy-700">
        {{ dashboard.totalWorkPoints }}{{ t('dashboard.resumen.workPointsSuffix') }}
      </span>
    </div>

    <div
      v-if="dashboard.categories.length === 0"
      class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700"
    >
      {{ t('dashboard.resumen.emptyState') }}
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          v-for="h in headlineByCategory"
          :key="h.categoria"
          :titulo="categoryLabel(h.categoria, locale as Locale)"
          :valor="formatSummaryValue(h.v)"
          :cumplimiento-pct="h.v.cumplimientoPct"
          :estado="resolveDisplayStatus(h.v)"
          :icon="iconForCategory(h.categoria)"
        />
      </div>

      <ComplianceRing :compliance="dashboard.globalCompliance" />
    </template>

    <DashboardRiskSections
      v-if="organizationId"
      :service-slug="dashboard.service.slug"
      :organization-id="organizationId"
      :headline-cards="headlineCards"
    />
  </div>
</template>
