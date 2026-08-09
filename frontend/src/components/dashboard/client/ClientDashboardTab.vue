<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ListChecks, CheckCircle2, XCircle, Percent, Gauge, Bell } from 'lucide-vue-next'
import type { DashboardData } from '@/types/dashboard'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { roundDisplay } from '@/utils/formatNumber'
import type { CategoryCardStatus } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import SummaryCard from '../SummaryCard.vue'
import ClientStatCard from './ClientStatCard.vue'
import DashboardRiskSections from '../DashboardRiskSections.vue'
import { HEADLINE_CODE_POR_CATEGORIA } from './headlineVariables'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

const noCumplen = computed(() => props.dashboard.globalCompliance.amarillo + props.dashboard.globalCompliance.rojo)

// Mismo criterio de "peor caso gana" que categoriaEstado() en
// ClientDetalleTecnicoTab.vue — el estado semáforo de las tarjetas de
// indicadores globales (Cumplen/No cumplen/Cumplimiento/Alertas), no un
// umbral de porcentaje inventado.
const globalEstado = computed<CategoryCardStatus>(() => {
  const { rojo, amarillo, total } = props.dashboard.globalCompliance
  if (rojo > 0) return 'ROJO'
  if (amarillo > 0) return 'AMARILLO'
  if (total > 0) return 'VERDE'
  return 'SIN_DATOS'
})
const alertasEstado = computed<CategoryCardStatus>(() => (props.dashboard.alertasActivas > 0 ? 'ROJO' : 'VERDE'))

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

/** Ver comentario en ResumenTab.vue (versión admin) — dashboard.categories
 * ya viene filtrado por categorías habilitadas (single filtering point). */
const enabledCategorias = computed(() => props.dashboard.categories.map((c) => c.categoria))
</script>

<template>
  <div class="grid gap-6">
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientDashboardTab.indicadoresGlobales') }}
      </p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.totalMediciones')"
          :valor="String(dashboard.globalCompliance.total)"
          :icon="ListChecks"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.cumplenNorma')"
          :valor="String(dashboard.globalCompliance.verde)"
          :icon="CheckCircle2"
          estado="VERDE"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.noCumplenNorma')"
          :valor="String(noCumplen)"
          :icon="XCircle"
          :estado="noCumplen > 0 ? 'ROJO' : 'VERDE'"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.cumplimientoGlobal')"
          :valor="`${roundDisplay(dashboard.globalCompliance.pct)}%`"
          :icon="Percent"
          :estado="globalEstado"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.riesgoGlobal')"
          :valor="riesgoGlobalLabel"
          :pendiente="!dashboard.riesgoGlobal"
          :icon="Gauge"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.clientDashboardTab.alertasActivas')"
          :valor="String(dashboard.alertasActivas)"
          :icon="Bell"
          :estado="alertasEstado"
          compact
        />
      </div>
    </div>

    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientDashboardTab.valorCabecera') }}
      </p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          v-for="{ categoria, variable } in headlineCards"
          :key="categoria"
          :titulo="categoryLabel(categoria, locale as Locale)"
          :valor="variable!.estado === 'SIN_DATOS' ? '—' : String(roundDisplay(variable!.promedio))"
          :unidad="variable!.estado === 'SIN_DATOS' ? '' : variable!.unidadMedida"
          :cumplimiento-pct="roundDisplay(variable!.cumplimientoPct)"
          :estado="resolveDisplayStatus(variable!)"
          :icon="iconForCategory(categoria)"
          compact
        />
      </div>
    </div>

    <DashboardRiskSections
      :service-slug="dashboard.service.slug"
      :headline-cards="headlineCards"
      :enabled-categorias="enabledCategorias"
    />
  </div>
</template>
