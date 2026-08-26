<script setup lang="ts">
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'

defineProps<{ title: string }>()

const primaryTextClass = useOrgPrimaryTextClass()
</script>

<template>
  <div
    class="flex min-h-[52px] min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--org-primary,#0b1a33)] px-4 py-3 print:hidden sm:px-5"
  >
    <!-- sm:truncate (no truncate a secas): en móvil el título completo
    (servicio — empresa — pestaña) no cabe en una sola línea, y truncarlo
    con "..." se comía justo la parte más importante — en qué pestaña está
    parado el usuario. Se permite pasar a una segunda línea en vez de
    perder esa información; en pantallas ≥640px sigue truncando en una
    línea como antes (ahí sí suele caber completo). -->
    <p class="min-w-0 text-sm font-semibold sm:truncate" :class="primaryTextClass.text">{{ title }}</p>
    <!-- Opcional: acciones en línea con el título (ej. selector de empresa +
    botón de carga en el admin de Higiene Industrial) — sin contenido acá,
    el banner se ve exactamente igual que siempre. -->
    <div v-if="$slots.actions" class="flex flex-shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
