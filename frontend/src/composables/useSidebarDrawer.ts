import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

interface SidebarDrawerContext {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
}

const SIDEBAR_DRAWER_KEY: InjectionKey<SidebarDrawerContext> = Symbol('sidebar-drawer')

/** Llamar una vez en el layout que contiene el botón hamburguesa —
 * DashboardSidebar (arbitrariamente anidado dentro del slot) se conecta a
 * este mismo estado vía useSidebarDrawer(). */
export function provideSidebarDrawer(): SidebarDrawerContext {
  const isOpen = ref(false)
  const context: SidebarDrawerContext = {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    },
    toggle: () => {
      isOpen.value = !isOpen.value
    },
  }
  provide(SIDEBAR_DRAWER_KEY, context)
  return context
}

export function useSidebarDrawer(): SidebarDrawerContext {
  const context = inject(SIDEBAR_DRAWER_KEY)
  if (!context) {
    throw new Error('useSidebarDrawer() debe usarse dentro de un árbol que llamó provideSidebarDrawer()')
  }
  return context
}
