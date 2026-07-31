<script setup lang="ts">
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CategoryCardStatus } from '@/types/dashboard'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'

const props = defineProps<{
  titulo: string
  valor: string
  cumplimientoPct: number
  estado: CategoryCardStatus
  icon?: Component
}>()

const { t } = useI18n()
const styles = SEMAPHORE_STYLES[props.estado]
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-4" :class="['border-l-4', styles.accent]">
    <div class="flex items-center gap-2">
      <component :is="icon" v-if="icon" class="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
      <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ titulo }}</p>
    </div>

    <!-- font-mono + tabular-nums: dato científico, se lee como salida de
     instrumento, no como cifra de marketing (serif). -->
    <p class="mt-2 font-mono text-2xl font-semibold tabular-nums text-navy-900">{{ valor }}</p>

    <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-50" role="presentation">
      <div
        class="h-full rounded-full transition-[width]"
        :class="styles.dot"
        :style="{ width: `${Math.min(100, Math.max(0, cumplimientoPct))}%` }"
      />
    </div>

    <div class="mt-2 flex items-center justify-between gap-2">
      <span class="text-[11px] text-navy-700 opacity-70">
        {{ t('dashboard.summaryCard.complianceLabel') }}{{ cumplimientoPct }}%
      </span>
      <!-- Punto + texto, nunca solo color: el estado debe leerse aunque el
       usuario no distinga el color (daltonismo, escala de grises, impresión). -->
      <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase" :class="styles.text">
        <span :class="styles.dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
        {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
      </span>
    </div>
  </div>
</template>
