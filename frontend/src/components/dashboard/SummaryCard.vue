<script setup lang="ts">
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CategoryCardStatus } from '@/types/dashboard'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'

const props = withDefaults(
  defineProps<{
    titulo: string
    valor: string
    cumplimientoPct: number
    estado: CategoryCardStatus
    icon?: Component
    /** Unidad de medida, mostrada aparte del valor solo en modo `enhanced`
     * (ej. "lux" en "485 lux") — sin esto, `valor` se muestra tal cual. */
    unidad?: string
    /** Tratamiento visual reforzado para el panel admin (2026-08, "elevar
     * percepción de calidad de cara a venta"): valor más grande con la
     * unidad en tamaño menor aparte, y el estado como pill relleno en vez
     * de solo punto+texto. Sin esta prop, la tarjeta se ve exactamente
     * igual que siempre — la vista cliente (ClientDashboardTab.vue) nunca
     * la pasa, a propósito, para no tocar su diseño. */
    enhanced?: boolean
    /** Vista compacta (2026-08, "Hoja 1 cliente en una sola pantalla"):
     * icono/valor más chicos y sin la barra de progreso — solo el pill de
     * estado, para que las tarjetas de agente quepan en una sola fila. Sin
     * esta prop, se ve igual que siempre — solo ClientDashboardTab.vue la
     * pasa (y nunca junto con `enhanced`). */
    compact?: boolean
  }>(),
  { unidad: '', enhanced: false, compact: false },
)

const { t } = useI18n()
const styles = SEMAPHORE_STYLES[props.estado]
</script>

<template>
  <div
    class="rounded-lg border border-line-strong bg-white"
    :class="['border-l-4', styles.accent, compact ? 'p-3' : enhanced ? 'p-5' : 'p-4']"
  >
    <div class="flex items-center gap-2" :class="compact ? 'gap-1.5' : 'gap-2'">
      <component
        :is="icon"
        v-if="icon"
        class="shrink-0 text-sky-400"
        :class="compact ? 'h-3 w-3' : 'h-4 w-4'"
        aria-hidden="true"
      />
      <p
        class="truncate font-semibold uppercase tracking-wide text-navy-700 opacity-70"
        :class="compact ? 'text-[10px]' : 'text-xs'"
      >
        {{ titulo }}
      </p>
    </div>

    <!-- font-mono + tabular-nums: dato científico, se lee como salida de
     instrumento, no como cifra de marketing (serif). En modo enhanced, la
     unidad se separa en un tamaño menor para que el número sea lo primero
     que se lee — antes ambos iban en el mismo tamaño, compitiendo. -->
    <p v-if="compact" class="mt-1.5 flex items-baseline gap-1">
      <span class="font-mono text-xl font-bold tabular-nums text-navy-900">{{ valor }}</span>
      <span v-if="unidad" class="font-mono text-[11px] font-medium text-navy-700/60">{{ unidad }}</span>
    </p>
    <p v-else-if="enhanced" class="mt-2.5 flex items-baseline gap-1.5">
      <span class="font-mono text-3xl font-bold tabular-nums text-navy-900">{{ valor }}</span>
      <span v-if="unidad" class="font-mono text-sm font-medium text-navy-700/60">{{ unidad }}</span>
    </p>
    <p v-else class="mt-2 font-mono text-2xl font-semibold tabular-nums text-navy-900">{{ valor }}</p>

    <!-- Compacta: solo el pill de estado, sin barra de progreso ni texto de
     "sin norma" — pensada para una fila de 5 tarjetas donde no entra tanto
     detalle (el detalle completo sigue disponible en Comparativo vs.
     Norma, más abajo en la misma vista). -->
    <span
      v-if="compact"
      class="mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
      :class="[styles.bg, styles.text, styles.border]"
    >
      <span :class="styles.dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
      {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
    </span>

    <!-- Sin norma definida: no hay nada con qué medir "cumplimiento", así
     que no tiene sentido mostrar una barra en 0% (se leía como "reprobado"
     cuando en realidad es "catálogo incompleto todavía"). -->
    <template v-else-if="estado === 'SIN_NORMA'">
      <p class="mt-3 text-[11px] text-slate-500">{{ t('dashboard.summaryCard.normaPendiente') }}</p>
      <span
        v-if="!enhanced"
        class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase"
        :class="styles.text"
      >
        <span :class="styles.dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
        {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
      </span>
      <span
        v-else
        class="mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
        :class="[styles.bg, styles.text, styles.border]"
      >
        <span :class="styles.dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
        {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
      </span>
    </template>
    <template v-else>
      <!-- El track usa el tono pastel del propio estado (no un gris neutro):
       así una tarjeta en 0% de cumplimiento sigue mostrando su color de
       estado en vez de una barra en blanco indistinguible de "sin datos". -->
      <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" :class="styles.bg" role="presentation">
        <div
          class="h-full rounded-full transition-[width]"
          :class="styles.dot"
          :style="{ width: `${Math.min(100, Math.max(0, cumplimientoPct))}%` }"
        />
      </div>

      <div class="mt-2.5 flex items-center justify-between gap-2">
        <span class="text-[11px] text-navy-700 opacity-70">
          {{ t('dashboard.summaryCard.complianceLabel') }}{{ cumplimientoPct }}%
        </span>
        <!-- Estado: en modo enhanced es un pill relleno (fondo + borde del
         color de estado), no solo punto+texto — se identifica de un
         vistazo, sin depender de leer el texto. Punto + texto siempre
         presentes en ambos modos: el estado debe leerse aunque el usuario
         no distinga el color (daltonismo, escala de grises, impresión). -->
        <span
          v-if="!enhanced"
          class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase"
          :class="styles.text"
        >
          <span :class="styles.dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
          {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
          :class="[styles.bg, styles.text, styles.border]"
        >
          <span :class="styles.dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
          {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
        </span>
      </div>
    </template>
  </div>
</template>
