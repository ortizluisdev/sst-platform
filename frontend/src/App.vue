<script setup lang="ts">
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
</script>

<template>
  <router-view />
  <ToastContainer />
  <ConfirmDialog />
</template>
