import type { HigieneCategoria } from '@/services/dashboard.service'

/** Mapea el enum `HigieneCategoria` (usado por OrganizationCategoryConfig y
 * ServiceHeatmapImage.categoria) contra el string libre que trae
 * `dashboard.categories[].categoria` (VariableDefinition.categoria, sembrado
 * en el backend) — mismo par de mapas que
 * backend/src/utils/higieneCategorias.ts, necesario acá para poder cruzar
 * "categorías habilitadas" (dashboard.categories, ya filtrado server-side)
 * contra las imágenes del mapa de calor (que sí guardan el enum). */
export const CATEGORIA_ENUM_TO_LABEL: Record<HigieneCategoria, string> = {
  ESTRES_TERMICO: 'Estrés Térmico',
  ILUMINACION: 'Iluminación',
  SONIDO: 'Sonido',
  RADIACION_UV: 'Radiación UV',
  VIBRACION: 'Vibración',
}

const LABEL_TO_CATEGORIA_ENUM: Record<string, HigieneCategoria> = Object.fromEntries(
  Object.entries(CATEGORIA_ENUM_TO_LABEL).map(([enumValue, label]) => [label, enumValue as HigieneCategoria]),
)

export function categoriaEnumFromLabel(label: string): HigieneCategoria | undefined {
  return LABEL_TO_CATEGORIA_ENUM[label]
}
