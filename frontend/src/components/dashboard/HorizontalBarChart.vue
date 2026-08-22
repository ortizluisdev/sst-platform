<script setup lang="ts">
import { computed } from 'vue'

export interface HorizontalBarItem {
  label: string
  value: number
  /** Texto a mostrar a la derecha de la barra — si no se pasa, se usa
   * `value` tal cual. */
  display?: string
  /** Clase Tailwind completa para el color de relleno (nunca interpolada:
   * 'bg-sky-400', no `bg-${color}-400`) — por defecto 'bg-sky-400'. */
  colorClass?: string
}

const props = defineProps<{ items: HorizontalBarItem[]; max?: number }>()

/** Sin `max` explícito, se usa el mayor valor del propio arreglo (mínimo 1
 * para evitar dividir por cero) — mismo criterio que el patrón `hbar()` del
 * HTML de referencia del cliente (`Math.max(...items.map(i=>i.value), 1)`). */
const effectiveMax = computed(() => props.max ?? Math.max(...props.items.map((i) => i.value), 1))

function widthPct(value: number): number {
  // Piso de 2%: un valor de 0 (o muy chico frente al resto) sigue mostrando
  // una franja de color visible en vez de desaparecer — mismo criterio que
  // el HTML de referencia (`Math.max(2, Math.min(100, ...))`).
  return Math.max(2, Math.min(100, (value / effectiveMax.value) * 100))
}
</script>

<template>
  <div class="grid gap-2.5">
    <div v-for="item in items" :key="item.label" class="flex items-center gap-3 text-[13px]">
      <p class="w-[45%] min-w-0 shrink-0 truncate font-medium text-navy-900" :title="item.label">
        {{ item.label }}
      </p>
      <div class="h-3.5 flex-1 overflow-hidden rounded-full bg-line" role="presentation">
        <div
          class="h-full rounded-full transition-[width]"
          :class="item.colorClass ?? 'bg-sky-400'"
          :style="{ width: `${widthPct(item.value)}%` }"
        />
      </div>
      <p class="w-14 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-navy-900">
        {{ item.display ?? item.value }}
      </p>
    </div>
  </div>
</template>
