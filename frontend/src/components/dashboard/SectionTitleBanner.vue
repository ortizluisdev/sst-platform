<script setup lang="ts">
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'

defineProps<{ title: string }>()

const primaryTextClass = useOrgPrimaryTextClass()
</script>

<template>
  <div class="rounded-lg bg-[var(--org-primary,#0b1a33)] px-4 py-3 print:hidden sm:px-5">
    <p class="text-sm font-semibold" :class="primaryTextClass.text">{{ title }}</p>
  </div>
</template>
