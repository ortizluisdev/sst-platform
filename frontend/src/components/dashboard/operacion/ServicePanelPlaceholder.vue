<script setup lang="ts">
import { Construction } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

defineProps<{ nombre: string }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-white p-12 text-center">
    <Construction class="h-8 w-8 text-navy-700/40" aria-hidden="true" />
    <h2 class="text-base font-bold text-navy-900">{{ nombre }}</h2>
    <p class="max-w-sm text-sm text-navy-700/70">{{ t('dashboard.operacion.placeholder') }}</p>
  </div>
</template>
