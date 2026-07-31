<script setup lang="ts">
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'

withDefaults(defineProps<{ loading?: boolean; loadingLabel?: string }>(), { loading: false, loadingLabel: '' })

const primaryTextClass = useOrgPrimaryTextClass()
</script>

<template>
  <button
    type="submit"
    :disabled="loading"
    class="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[var(--org-primary,#0b1a33)] bg-[var(--org-primary,#0b1a33)] px-7 py-3.5 text-sm font-medium tracking-wide transition-all duration-[250ms] hover:bg-transparent hover:text-[var(--org-primary,#0b1a33)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
    :class="primaryTextClass.text"
  >
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
      <path
        class="opacity-75"
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <template v-if="loading">{{ loadingLabel }}</template>
    <slot v-else />
  </button>
</template>
