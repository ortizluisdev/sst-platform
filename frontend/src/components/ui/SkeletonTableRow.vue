<script setup lang="ts">
/** Fila de tabla placeholder — mismo número de columnas que la tabla real
 * donde se usa, para que el "filtrando..." de Hoja 2 se sienta como que la
 * tabla sigue ahí cargando, no como que desapareció. */
withDefaults(defineProps<{ columns?: number }>(), { columns: 4 })
</script>

<template>
  <tr class="animate-pulse border-t border-line" role="presentation">
    <td v-for="i in columns" :key="i" class="px-5 py-3.5">
      <div class="h-3.5 rounded-full bg-line-strong" :style="{ width: i === 1 ? '65%' : '45%' }" />
    </td>
  </tr>
</template>
