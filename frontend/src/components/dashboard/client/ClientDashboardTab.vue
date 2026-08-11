<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData } from '@/types/dashboard'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { roundDisplay } from '@/utils/formatNumber'
import type { Locale } from '@/i18n'
import SummaryCard from '../SummaryCard.vue'
import GlobalIndicatorsRow from '../GlobalIndicatorsRow.vue'
import DashboardRiskSections from '../DashboardRiskSections.vue'
import { HEADLINE_CODE_POR_CATEGORIA } from './headlineVariables'

const props = defineProps<{ dashboard: DashboardData }>()
const emit = defineEmits<{ viewAllNonConformities: [] }>()
const { t, locale } = useI18n()

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
  <div class="grid min-w-0 gap-6">
    <GlobalIndicatorsRow :dashboard="dashboard" />

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
      :global-compliance="dashboard.globalCompliance"
      @view-all-non-conformities="emit('viewAllNonConformities')"
    />
  </div>
</template>
