<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useCanvasNetwork, type CanvasNetworkOptions } from '@/composables/useCanvasNetwork'

const props = withDefaults(defineProps<CanvasNetworkOptions>(), {})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const network = useCanvasNetwork(canvasRef, props)

let intersectionObserver: IntersectionObserver | null = null
const prefersReduced = ref(false)

onMounted(() => {
  prefersReduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced.value) {
    network.drawStaticFrame()
    return
  }

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          network.start()
        } else {
          network.stop()
        }
      }
    },
    { threshold: 0 },
  )
  if (canvasRef.value) intersectionObserver.observe(canvasRef.value)
})

onUnmounted(() => {
  intersectionObserver?.disconnect()
  network.teardown()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    aria-hidden="true"
    class="pointer-events-auto absolute inset-0 h-full w-full"
    :class="{ 'opacity-50': prefersReduced }"
  />
</template>
