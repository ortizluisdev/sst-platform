<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ListChecks, CheckCircle2, XCircle, Percent, Gauge, Bell } from 'lucide-vue-next'
import type { DashboardData } from '@/types/dashboard'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { formatSummaryValue } from '@/utils/formatSummaryValue'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import type { Locale } from '@/i18n'
import SummaryCard from '../SummaryCard.vue'
import ClientStatCard from './ClientStatCard.vue'
import DashboardRiskSections from '../DashboardRiskSections.vue'
import { HEADLINE_CODE_POR_CATEGORIA } from './headlineVariables'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

const noCumplen = computed(() => props.dashboard.globalCompliance.amarillo + props.dashboard.globalCompliance.rojo)

const riesgoGlobalLabel = computed(() =>
  props.dashboard.riesgoGlobal
    ? t(`dashboard.clientDashboardTab.riskLevel.${props.dashboard.riesgoGlobal.nivel}`)
    : t('dashboard.clientDashboardTab.sinNormaAplicable'),
)

const headlineCards = computed(() =>
  Object.entries(HEADLINE_CODE_POR_CATEGORIA)
    .map(([categoria, codigo]) => {
      const categoriaData = props.dashboard.categories.find((c) => c.categoria === categoria)
      const variable = categoriaData?.variables.find((v) => v.codigo === codigo)
      return { categoria, variable }
    })
    .filter((entry) => entry.variable),
)
</script>

<template>
  <div class="grid gap-6">
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientDashboardTab.indicadoresGlobales') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.totalMediciones')"
          :valor="String(dashboard.globalCompliance.total)"
          :icon="ListChecks"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.cumplenNorma')"
          :valor="String(dashboard.globalCompliance.verde)"
          :icon="CheckCircle2"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.noCumplenNorma')"
          :valor="String(noCumplen)"
          :icon="XCircle"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.cumplimientoGlobal')"
          :valor="`${dashboard.globalCompliance.pct}%`"
          :icon="Percent"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.riesgoGlobal')"
          :valor="riesgoGlobalLabel"
          :pendiente="!dashboard.riesgoGlobal"
          :icon="Gauge"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.alertasActivas')"
          :valor="String(dashboard.alertasActivas)"
          :icon="Bell"
        />
      </div>
    </div>

    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientDashboardTab.valorCabecera') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          v-for="{ categoria, variable } in headlineCards"
          :key="categoria"
          :titulo="categoryLabel(categoria, locale as Locale)"
          :valor="formatSummaryValue(variable!)"
          :cumplimiento-pct="variable!.cumplimientoPct"
          :estado="resolveDisplayStatus(variable!)"
          :icon="iconForCategory(categoria)"
        />
      </div>
    </div>

    <DashboardRiskSections :service-slug="dashboard.service.slug" :headline-cards="headlineCards" />
  </div>
</template>
