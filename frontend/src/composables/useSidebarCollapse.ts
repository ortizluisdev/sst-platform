import { inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

interface SidebarCollapseContext {
  collapsed: Ref<boolean>
  toggle: () => void
}

const STORAGE_KEY = 'roma-sidebar-collapsed'
export const SIDEBAR_COLLAPSE_KEY: InjectionKey<SidebarCollapseContext> = Symbol('sidebar-collapse')

/** Llamar una vez en el layout que envuelve tanto el sidebar como el
 * contenido que necesita saber su ancho (DashboardLayout.vue) — antes vivía
 * como estado 100% local de DashboardSidebar.vue, pero el navbar/footer
 * fijos (2026-08, "app shell") necesitan el mismo valor para calcular su
 * padding-left, así que pasa a compartirse vía provide/inject, mismo patrón
 * que useSidebarDrawer.ts. */
export function provideSidebarCollapse(): SidebarCollapseContext {
  const collapsed = ref(localStorage.getItem(STORAGE_KEY) === 'true')
  watch(collapsed, (value) => localStorage.setItem(STORAGE_KEY, String(value)))
  const context: SidebarCollapseContext = {
    collapsed,
    toggle: () => {
      collapsed.value = !collapsed.value
    },
  }
  provide(SIDEBAR_COLLAPSE_KEY, context)
  return context
}

export function useSidebarCollapse(): SidebarCollapseContext {
  const context = inject(SIDEBAR_COLLAPSE_KEY)
  if (!context) {
    throw new Error('useSidebarCollapse() debe usarse dentro de un árbol que llamó provideSidebarCollapse()')
  }
  return context
}
