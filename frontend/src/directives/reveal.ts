import type { Directive } from 'vue'

interface RevealElement extends HTMLElement {
  __revealObserver?: IntersectionObserver
}

const HIDDEN_CLASSES = ['opacity-0', 'translate-y-4']
const BASE_CLASSES = ['transition-all', 'duration-700', 'ease-out']

/**
 * `v-reveal` — fades + slides an element up the first time it enters the
 * viewport. `v-reveal="150"` adds a 150ms transition-delay for staggering
 * siblings. No-ops under `prefers-reduced-motion: reduce`.
 */
export const vReveal: Directive<RevealElement, number | undefined> = {
  mounted(el, binding) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    el.classList.add(...BASE_CLASSES, ...HIDDEN_CLASSES)
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.remove(...HIDDEN_CLASSES)
            observer.unobserve(el)
          }
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    el.__revealObserver = observer
  },
  beforeUnmount(el) {
    el.__revealObserver?.disconnect()
  },
}
