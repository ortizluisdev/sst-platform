<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ListChecks, CheckCircle2, XCircle, Percent, Gauge, Bell } from 'lucide-vue-next'
import type { CategoryCardStatus, DashboardData } from '@/types/dashboard'
import { roundDisplay } from '@/utils/formatNumber'
import ClientStatCard from './client/ClientStatCard.vue'

/** Fila de 6 indicadores globales — antes solo existía en Hoja 1 cliente
 * (ClientDashboardTab.vue), el Dashboard admin (ResumenTab.vue) no la
 * tenía. Extraída acá para que ambas vistas usen exactamente la misma
 * lógica de estado en vez de mantener dos copias. */
const props = defineProps<{ dashboard: DashboardData }>()
const { t } = useI18n()

const noCumplen = computed(() => props.dashboard.globalCompliance.amarillo + props.dashboard.globalCompliance.rojo)

// "Peor caso gana" — nunca un umbral de porcentaje inventado.
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
</script>

<template>
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
</template>
