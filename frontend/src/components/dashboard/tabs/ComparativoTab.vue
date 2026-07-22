<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CategorySummary } from '@/types/dashboard'
import ComparisonTable from '../ComparisonTable.vue'

defineProps<{ categories: CategorySummary[] }>()
const { t } = useI18n()
</script>

<template>
  <div class="grid gap-4">
    <p class="text-sm text-navy-700 opacity-70">
      {{ t('dashboard.comparativo.subtitle') }}
    </p>
    <ComparisonTable :categories="categories" />
  </div>
</template>
