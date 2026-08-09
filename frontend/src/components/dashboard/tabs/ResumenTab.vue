<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardData } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import SummaryCard from '../SummaryCard.vue'
import DashboardRiskSections from '../DashboardRiskSections.vue'
import { iconForCategory } from '@/utils/categoryIcon'
import { categoryLabel } from '@/utils/categoryLabel'
import { roundDisplay } from '@/utils/formatNumber'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { HEADLINE_CODE_POR_CATEGORIA } from '../client/headlineVariables'

const props = defineProps<{ dashboard: DashboardData; organizationId?: string }>()
const emit = defineEmits<{ viewAllNonConformities: [] }>()
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

/** Labels de las categorías habilitadas de esta organización — a diferencia
 * de headlineCards (que siempre trae las 5 entradas, con `variable`
 * undefined tanto si está deshabilitada como si no tiene datos),
 * dashboard.categories solo trae las habilitadas (single filtering point,
 * ver variables.service.ts). Necesario para el carrusel de mapas de calor
 * (DashboardRiskSections.vue), que debe mostrar únicamente las categorías
 * de servicios contratados vigentes. */
const enabledCategorias = computed(() => props.dashboard.categories.map((c) => c.categoria))
</script>

<template>
  <!-- Sin tarjeta de título/fecha propia: esa info ya está en el banner de
  ruta (servicio — empresa — pestaña, arriba de este componente) y en el
  footer (última sincronización) — repetirla acá era redundante. -->
  <div class="grid gap-8">
    <div
      v-if="dashboard.categories.length === 0"
      class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700"
    >
      {{ t('dashboard.resumen.emptyState') }}
    </div>

    <template v-else>
      <!-- compact (mismo tratamiento ya construido para Hoja 1 cliente):
      tarjetas más chicas, alineadas en una sola fila hasta 5 columnas en
      vez de 3 — "las tarjetas deben quedar más pequeñas pero alineadas". -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          v-for="h in headlineByCategory"
          :key="h.categoria"
          :titulo="categoryLabel(h.categoria, locale as Locale)"
          :valor="h.v.estado === 'SIN_DATOS' ? '—' : String(roundDisplay(h.v.promedio))"
          :unidad="h.v.estado === 'SIN_DATOS' ? '' : h.v.unidadMedida"
          :cumplimiento-pct="roundDisplay(h.v.cumplimientoPct)"
          :estado="resolveDisplayStatus(h.v)"
          :icon="iconForCategory(h.categoria)"
          compact
        />
      </div>
    </template>

    <DashboardRiskSections
      v-if="organizationId"
      :service-slug="dashboard.service.slug"
      :organization-id="organizationId"
      :headline-cards="headlineCards"
      :enabled-categorias="enabledCategorias"
      :global-compliance="dashboard.globalCompliance"
      @view-all-non-conformities="emit('viewAllNonConformities')"
    />
  </div>
</template>
