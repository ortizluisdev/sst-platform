import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Tracks which of the given section ids is currently "active" (closest to the
 * top of the viewport, inside a thin band near the top) as the user scrolls.
 */
export function useScrollSpy(sectionIds: string[]) {
  const activeId = ref(sectionIds[0] ?? '')
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const elements = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b))
        activeId.value = topMost.target.id
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )

    elements.forEach((el) => observer?.observe(el))
  })

  onUnmounted(() => observer?.disconnect())

  return { activeId }
}
