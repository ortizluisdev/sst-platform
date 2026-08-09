<script setup lang="ts">
import type { Component } from 'vue'
import type { CategoryCardStatus } from '@/types/dashboard'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'

const props = defineProps<{
  titulo: string
  valor: string
  pendiente?: boolean
  icon?: Component
  /** Opcional: solo se pasa cuando el número realmente tiene un estado
   * semáforo aplicable (ej. cumplimiento global, según el peor caso entre
   * verde/amarillo/rojo) — las tarjetas del Grupo B (riesgo/prioridad
   * calculados, pendientes de validación formal) no lo reciben a
   * propósito, para no insinuar un juicio de "bien/mal" sobre una
   * metodología todavía no aprobada. */
  estado?: CategoryCardStatus
  /** Vista compacta (2026-08, "Hoja 1 cliente en una sola pantalla"): icono
   * más chico, menos padding, valor más pequeño — pensada para que las 6
   * tarjetas de indicadores globales quepan en una sola fila sin envolver.
   * Sin esta prop, la tarjeta se ve exactamente igual que siempre —
   * ClientAnalisisTab.vue no la pasa, a propósito, no es parte de este
   * alcance. */
  compact?: boolean
}>()

const styles = props.estado ? SEMAPHORE_STYLES[props.estado] : null
</script>

<template>
  <div
    class="rounded-lg border border-line-strong bg-white"
    :class="[styles ? ['border-l-4', styles.accent] : '', compact ? 'p-3' : 'p-5']"
  >
    <div class="flex" :class="compact ? 'items-start gap-1.5' : 'items-center gap-2'">
      <span
        v-if="icon"
        class="flex shrink-0 items-center justify-center rounded-md"
        :class="[styles ? styles.bg : 'bg-sky-50', compact ? 'h-5 w-5' : 'h-7 w-7']"
      >
        <component
          :is="icon"
          :class="[styles ? styles.text : 'text-sky-400', compact ? 'h-3 w-3' : 'h-4 w-4']"
          aria-hidden="true"
        />
      </span>
      <p
        class="font-semibold uppercase tracking-wide text-navy-700 opacity-70"
        :class="compact ? 'line-clamp-2 text-[10px] leading-tight' : 'truncate text-xs'"
      >
        {{ titulo }}
      </p>
    </div>
    <p
      class="font-serif font-semibold"
      :class="[
        pendiente ? 'text-navy-700 opacity-40' : 'text-navy-900',
        compact ? 'mt-1.5 text-xl' : 'mt-2.5 text-3xl',
      ]"
    >
      {{ valor }}
    </p>
  </div>
</template>
