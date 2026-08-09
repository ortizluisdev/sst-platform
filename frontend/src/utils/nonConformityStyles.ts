import type { NonConformityPriority, NonConformityStatus } from '@/types/dashboard'

/** Clases Tailwind completas (nunca interpoladas — ver semaphoreStyles.ts
 * para la explicación del gotcha con el scanner de Tailwind v4).
 *
 * `dot` agregado (2026-08, panel admin) para que estos badges puedan
 * mostrar el mismo punto de color que ya usan SEMAPHORE_STYLES y las
 * tarjetas KPI — visualmente más consistente en todo el dashboard admin
 * sin cambiar los tonos bg/text/border ya en uso (la vista cliente sigue
 * viendo exactamente los mismos colores, solo el admin agrega el punto). */
export const PRIORITY_STYLES: Record<NonConformityPriority, { dot: string; text: string; bg: string; border: string }> = {
  ALTA: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  MEDIA: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  BAJA: { dot: 'bg-sky-600', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
}

export const STATUS_STYLES: Record<NonConformityStatus, { dot: string; text: string; bg: string; border: string }> = {
  ABIERTA: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  EN_SEGUIMIENTO: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  CERRADA: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
}
