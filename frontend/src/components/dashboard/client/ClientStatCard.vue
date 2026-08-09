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
}>()

const styles = props.estado ? SEMAPHORE_STYLES[props.estado] : null
</script>

<template>
  <div
    class="rounded-lg border border-line-strong bg-white p-5"
    :class="styles ? ['border-l-4', styles.accent] : ''"
  >
    <div class="flex items-center gap-2">
      <span
        v-if="icon"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        :class="styles ? styles.bg : 'bg-sky-50'"
      >
        <component :is="icon" class="h-4 w-4" :class="styles ? styles.text : 'text-sky-400'" aria-hidden="true" />
      </span>
      <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ titulo }}</p>
    </div>
    <p class="mt-2.5 font-serif text-3xl font-semibold" :class="pendiente ? 'text-navy-700 opacity-40' : 'text-navy-900'">
      {{ valor }}
    </p>
  </div>
</template>
