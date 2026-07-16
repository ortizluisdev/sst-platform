import { onMounted, onUnmounted, type Ref } from 'vue'

export interface ScrollRevealOptions {
  threshold?: number
}

/**
 * Fires `onReveal` once, the first time `target` enters the viewport, then stops observing.
 * Used for scroll-triggered microinteractions (counters, fade-ins) across the landing sections.
 */
export function useScrollReveal(
  target: Ref<HTMLElement | null>,
  onReveal: () => void,
  options: ScrollRevealOptions = {},
) {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!target.value) return
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onReveal()
            observer?.unobserve(entry.target)
          }
        }
      },
      { threshold: options.threshold ?? 0.3 },
    )
    observer.observe(target.value)
  })

  onUnmounted(() => observer?.disconnect())
}
