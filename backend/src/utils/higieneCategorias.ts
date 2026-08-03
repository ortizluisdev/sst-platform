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
