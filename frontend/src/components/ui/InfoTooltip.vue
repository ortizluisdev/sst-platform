<script setup lang="ts">
import { Info } from 'lucide-vue-next'

defineProps<{ text: string }>()
</script>

<template>
  <!-- Ícono de ayuda con tooltip al pasar el mouse o al enfocar con teclado
  (group-focus-within, no solo group-hover) — un <button> en vez de un
  <span> para que sea alcanzable por teclado/lectores de pantalla, mismo
  criterio que ya usa el botón flotante de WhatsApp (SocialLinks.vue). -->
  <span class="group relative inline-flex">
    <button
      type="button"
      class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-navy-700/40 transition-colors hover:text-sky-500 focus-visible:text-sky-500 focus-visible:outline-none"
      :aria-label="text"
    >
      <Info class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    <span
      role="tooltip"
      class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-md bg-navy-900 px-2.5 py-1.5 text-center text-[11px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {{ text }}
      <span
        class="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 bg-navy-900"
        aria-hidden="true"
      />
    </span>
  </span>
</template>
