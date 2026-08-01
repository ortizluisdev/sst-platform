import type { NonConformityPriority, NonConformityStatus } from '@/types/dashboard'

/** Clases Tailwind completas (nunca interpoladas — ver semaphoreStyles.ts
 * para la explicación del gotcha con el scanner de Tailwind v4). */
export const PRIORITY_STYLES: Record<NonConformityPriority, { text: string; bg: string; border: string }> = {
  ALTA: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  MEDIA: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  BAJA: { text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
}

export const STATUS_STYLES: Record<NonConformityStatus, { text: string; bg: string; border: string }> = {
  ABIERTA: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  EN_SEGUIMIENTO: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  CERRADA: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
}
