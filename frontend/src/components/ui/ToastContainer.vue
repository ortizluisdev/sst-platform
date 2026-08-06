<script setup lang="ts">
import Toast from './Toast.vue'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
    <Toast v-for="toast in toasts" :key="toast.id" :toast="toast" @dismiss="dismiss(toast.id)" />
  </div>
</template>
