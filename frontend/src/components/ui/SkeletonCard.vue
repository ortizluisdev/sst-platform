<script setup lang="ts">
/** Placeholder de carga con la misma forma que SummaryCard/ClientStatCard —
 * se muestra en su lugar mientras llegan los datos, en vez de un mensaje de
 * texto genérico ("Cargando...") que hace que toda la pantalla aparezca de
 * golpe cuando termina. */
withDefaults(defineProps<{ withBar?: boolean }>(), { withBar: true })
</script>

<template>
  <div class="animate-pulse rounded-lg border border-line-strong bg-white p-5" role="presentation">
    <div class="flex items-center gap-2">
      <div class="h-7 w-7 shrink-0 rounded-md bg-line-strong" />
      <div class="h-3 w-24 rounded-full bg-line-strong" />
    </div>
    <div class="mt-3 h-7 w-20 rounded-full bg-line-strong" />
    <div v-if="withBar" class="mt-4 h-1.5 w-full rounded-full bg-line-strong" />
  </div>
</template>
