import { Home, Table2, History, FileText } from 'lucide-vue-next'
import type { DashboardData } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { Locale } from '@/i18n'
import { iconForCategory } from './categoryIcon'
import { categoryLabel } from './categoryLabel'

/**
 * Pestañas fijas (Dashboard/Comparativo/Historial/Reportes) más una pestaña
 * por cada categoría única del catálogo de VariableDefinition cargado —
 * nunca hardcodeadas por nombre, así sirve para cualquier servicio (Higiene
 * Industrial hoy, otro mañana con sus propias categorías) sin tocar nada.
 * Extraído de DashboardShell.vue para que HigieneIndustrialPanel.vue (Fase C)
 * pueda calcular el mismo listado y subirlo al sidebar admin.
 */
export function buildDashboardTabs(dashboard: DashboardData, t: (key: string) => string, locale: Locale): TabDef[] {
  return [
    { key: 'resumen', label: t('dashboard.tabs.dashboard'), icon: Home },
    ...dashboard.categories.map((c) => ({
      key: `cat:${c.categoria}`,
      label: categoryLabel(c.categoria, locale),
      icon: iconForCategory(c.categoria),
    })),
    { key: 'comparativo', label: t('dashboard.tabs.comparativoNormativo'), icon: Table2 },
    { key: 'historial', label: t('dashboard.tabs.historial'), icon: History },
    { key: 'reportes', label: t('dashboard.tabs.reportes'), icon: FileText },
  ]
}
