import { defineAsyncComponent } from 'vue'

/**
 * Single async definition shared by every section — Vue caches the load
 * promise on this object, so importing it from multiple sections still
 * only fetches and mounts one chunk.
 */
export const AnimatedNetworkBackgroundAsync = defineAsyncComponent(() => import('./AnimatedNetworkBackground.vue'))
