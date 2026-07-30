<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  titulo: string
  valor: string
  pendiente?: boolean
  icon?: Component
}>()
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-5">
    <div class="flex items-center gap-2">
      <component :is="icon" v-if="icon" class="h-4.5 w-4.5 shrink-0 text-sky-400" aria-hidden="true" />
      <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ titulo }}</p>
    </div>
    <p class="mt-2 font-serif text-3xl font-semibold" :class="pendiente ? 'text-navy-700 opacity-40' : 'text-navy-900'">
      {{ valor }}
    </p>
  </div>
</template>
