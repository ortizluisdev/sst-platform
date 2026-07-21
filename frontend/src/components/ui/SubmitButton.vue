<script setup lang="ts">
withDefaults(defineProps<{ loading?: boolean; loadingLabel?: string }>(), { loading: false, loadingLabel: '' })
</script>

<template>
  <button
    type="submit"
    :disabled="loading"
    class="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-navy-900 bg-navy-900 px-7 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-[250ms] hover:bg-transparent hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
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
