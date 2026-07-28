<script setup lang="ts">
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CategoryCardStatus } from '@/types/dashboard'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'

const props = defineProps<{
  titulo: string
  valor: string
  cumplimientoPct: number
  estado: CategoryCardStatus
  icon?: Component
}>()

const { t } = useI18n()
const styles = SEMAPHORE_STYLES[props.estado]
</script>

<template>
  <div class="rounded-lg border border-line-strong bg-white p-5">
    <div class="flex items-center gap-2">
      <component :is="icon" v-if="icon" class="h-4.5 w-4.5 shrink-0 text-sky-400" aria-hidden="true" />
      <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ titulo }}</p>
    </div>
    <p class="mt-2 font-serif text-3xl font-semibold text-navy-900">{{ valor }}</p>
    <div class="mt-3 flex items-center justify-between">
      <span class="text-xs text-navy-700 opacity-70">{{ t('dashboard.summaryCard.complianceLabel') }}{{ cumplimientoPct }}%</span>
      <span :class="[styles.bg, styles.text, styles.border]" class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase">
        <span :class="styles.dot" class="h-1.5 w-1.5 rounded-full" />
        {{ t(SEMAPHORE_LABEL_KEY[estado]) }}
      </span>
    </div>
  </div>
</template>
