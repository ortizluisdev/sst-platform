import type { HigieneCategoria } from '@prisma/client'

/** Mapea el enum `HigieneCategoria` (usado por `OrganizationCategoryConfig`)
 * contra el string libre `VariableDefinition.categoria` tal como está
 * sembrado en seed.ts — son las 5 categorías de Higiene Industrial. */
export const CATEGORIA_ENUM_TO_LABEL: Record<HigieneCategoria, string> = {
  ESTRES_TERMICO: 'Estrés Térmico',
  ILUMINACION: 'Iluminación',
  SONIDO: 'Sonido',
  RADIACION_UV: 'Radiación UV',
  VIBRACION: 'Vibración',
}

export const TODAS_LAS_CATEGORIAS: HigieneCategoria[] = [
  'ESTRES_TERMICO',
  'ILUMINACION',
  'SONIDO',
  'RADIACION_UV',
  'VIBRACION',
]

/** Inverso de `CATEGORIA_ENUM_TO_LABEL` — usado donde se parte de
 * `VariableDefinition.categoria` (string libre) y se necesita el enum para
 * guardar/filtrar (ver NonConformity.categoria). `undefined` si el label no
 * es una de las 5 categorías de Higiene Industrial (otro servicio). */
const LABEL_TO_CATEGORIA_ENUM: Record<string, HigieneCategoria> = Object.fromEntries(
  Object.entries(CATEGORIA_ENUM_TO_LABEL).map(([enumValue, label]) => [label, enumValue as HigieneCategoria]),
)

export function categoriaEnumFromLabel(label: string): HigieneCategoria | undefined {
  return LABEL_TO_CATEGORIA_ENUM[label]
}
