<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Percent, XCircle, ListChecks } from 'lucide-vue-next'
import type { DashboardData, TrendPoint } from '@/types/dashboard'
import { categoryLabel } from '@/utils/categoryLabel'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import type { Locale } from '@/i18n'
import TrendChart from '../TrendChart.vue'
import ClientStatCard from './ClientStatCard.vue'
import { HEADLINE_CODE_POR_CATEGORIA } from './headlineVariables'

const props = defineProps<{ dashboard: DashboardData }>()
const { t, locale } = useI18n()

// Excluye variables SIN_NORMA (sin limiteMin ni limiteMax definidos en el
// catálogo) — antes este conteo usaba v.estado directo, que el backend
// marca AMARILLO tanto para una alerta real como para "no hay norma con
// qué comparar todavía" (ver resolveDisplayStatus.ts), inflando el número.
const variablesEnIncumplimiento = computed(
  () =>
    props.dashboard.categories
      .flatMap((c) => c.variables)
      .filter((v) => {
        const estado = resolveDisplayStatus(v)
        return estado === 'AMARILLO' || estado === 'ROJO'
      }).length,
)

const trendCharts = computed(() =>
  Object.entries(HEADLINE_CODE_POR_CATEGORIA)
    .map(([categoria, codigo]) => {
      const categoriaData = props.dashboard.categories.find((c) => c.categoria === categoria)
      const variable = categoriaData?.variables.find((v) => v.codigo === codigo)
      return { categoria, codigo, variable }
    })
    .filter((entry) => entry.variable),
)

// "Tendencia histórica por variable (6 meses)" — un periodo = una carga
// (ver trendAnalysis.ts, backend), nunca más de los últimos 6 aunque haya
// más historial. Mismo criterio de "insuficiente" que las otras 3 tarjetas
// de este grupo: con menos de 2 periodos un gráfico no muestra ninguna
// tendencia, solo un punto suelto.
const HISTORIA_MAX_PERIODOS = 6
const HISTORIA_MIN_PERIODOS = 2
const trendHistorico = computed<TrendPoint[]>(() => props.dashboard.trend.slice(-HISTORIA_MAX_PERIODOS))
const historiaInsuficiente = computed(() => trendHistorico.value.length < HISTORIA_MIN_PERIODOS)

// "Evolución del IGHO" reutiliza TrendChart (ya usado abajo para cada
// variable) construyendo una serie sintética de un solo "código" — evita
// duplicar el componente de gráfico solo por tener una forma de dato
// distinta (pct plano en vez de promedios por variable).
const evolucionIghoTrend = computed<TrendPoint[]>(
  () => props.dashboard.evolucionIgho?.map((p) => ({ fecha: p.fecha, promedios: { IGHO: p.pct } })) ?? [],
)

const tendenciaGlobalValor = computed(() => {
  const tendencia = props.dashboard.tendenciaGlobal
  if (!tendencia) return null
  const signo = tendencia.deltaPct > 0 ? '+' : ''
  return `${signo}${tendencia.deltaPct}%`
})

// Grupo B (interventionAnalysis.ts, backend) — metodologías propuestas y
// aprobadas para calcular, pero pendientes de validación formal con el
// responsable SST (ver grupoBDisclaimer más abajo, siempre visible junto a
// estas 4 tarjetas). `null` en cualquiera de los 4 significa que ninguna
// lectura del periodo tenía norma aplicable (mismo caso que riesgoGlobal).
const riesgoSaludValor = computed(() =>
  props.dashboard.riesgoSalud ? t(`dashboard.clientDashboardTab.riskLevel.${props.dashboard.riesgoSalud.nivel}`) : null,
)
const prioridadValor = computed(() =>
  props.dashboard.prioridadIntervencion
    ? t(`dashboard.clientAnalisisTab.prioridad.${props.dashboard.prioridadIntervencion}`)
    : null,
)
const matrizValor = computed(() =>
  props.dashboard.matrizPosicion ? t(`dashboard.clientAnalisisTab.matriz.${props.dashboard.matrizPosicion}`) : null,
)
</script>

<template>
  <div class="grid gap-6">
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientAnalisisTab.indicesGlobales') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.cumplimientoGlobal')"
          :valor="`${dashboard.globalCompliance.pct}%`"
          :icon="Percent"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.variablesIncumplimiento')"
          :valor="String(variablesEnIncumplimiento)"
          :icon="XCircle"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.medicionesRealizadas')"
          :valor="String(dashboard.globalCompliance.total)"
          :icon="ListChecks"
        />

        <!-- Grupo A: series temporales — calculadas, "Datos insuficientes"
         cuando falta historial (no "Pendiente", esa etiqueta es solo para
         el Grupo B, que sigue sin metodología definida). -->
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.tendenciaGlobal')"
          :valor="tendenciaGlobalValor ?? t('dashboard.clientAnalisisTab.datosInsuficientes')"
          :pendiente="!tendenciaGlobalValor"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.probabilidadIncumplimiento')"
          :valor="
            dashboard.probabilidadIncumplimiento
              ? `${dashboard.probabilidadIncumplimiento.probabilidadPct}%`
              : t('dashboard.clientAnalisisTab.datosInsuficientes')
          "
          :pendiente="!dashboard.probabilidadIncumplimiento"
        />

        <!-- Grupo B: metodologías propuestas y aprobadas para calcular,
         pendientes de validación formal con el responsable SST — ver
         grupoBDisclaimer debajo de esta grilla. -->
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.riesgoSalud')"
          :valor="riesgoSaludValor ?? t('dashboard.clientDashboardTab.sinNormaAplicable')"
          :pendiente="!riesgoSaludValor"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.puntajeIntervencion')"
          :valor="
            dashboard.puntajeIntervencion != null
              ? String(dashboard.puntajeIntervencion)
              : t('dashboard.clientDashboardTab.sinNormaAplicable')
          "
          :pendiente="dashboard.puntajeIntervencion == null"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.nivelPrioridad')"
          :valor="prioridadValor ?? t('dashboard.clientDashboardTab.sinNormaAplicable')"
          :pendiente="!prioridadValor"
        />
        <ClientStatCard
          :titulo="t('dashboard.clientAnalisisTab.matrizPosicion')"
          :valor="matrizValor ?? t('dashboard.clientDashboardTab.sinNormaAplicable')"
          :pendiente="!matrizValor"
        />
      </div>

      <p class="mt-3 text-xs italic text-navy-700/50">{{ t('dashboard.clientAnalisisTab.grupoBDisclaimer') }}</p>
    </div>

    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientAnalisisTab.evolucionIgho') }}
      </p>
      <TrendChart
        v-if="dashboard.evolucionIgho"
        :titulo="t('dashboard.clientAnalisisTab.evolucionIgho')"
        unidad-medida="%"
        codigo="IGHO"
        :trend="evolucionIghoTrend"
      />
      <p
        v-else
        class="rounded-lg border border-dashed border-line-strong bg-white p-6 text-center text-sm text-navy-700 opacity-60"
      >
        {{ t('dashboard.clientAnalisisTab.datosInsuficientes') }}
      </p>
    </div>

    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.clientAnalisisTab.tendenciaHistorica') }}
      </p>
      <div v-if="!historiaInsuficiente" class="grid gap-4 sm:grid-cols-2">
        <TrendChart
          v-for="{ categoria, codigo, variable } in trendCharts"
          :key="categoria"
          :titulo="categoryLabel(categoria, locale as Locale)"
          :unidad-medida="variable!.unidadMedida"
          :codigo="codigo"
          :trend="trendHistorico"
        />
      </div>
      <p
        v-else
        class="rounded-lg border border-dashed border-line-strong bg-white p-6 text-center text-sm text-navy-700 opacity-60"
      >
        {{ t('dashboard.clientAnalisisTab.datosInsuficientes') }}
      </p>
    </div>
  </div>
</template>
