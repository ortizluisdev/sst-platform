import type { CategoryCardStatus, SemaphoreStatus } from '@/types/dashboard'

/**
 * Clases Tailwind completas (nunca interpoladas: `bg-${color}-500` no lo
 * detecta el scanner de Tailwind v4 al compilar, necesita ver la clase
 * literal en el código fuente).
 */
export const SEMAPHORE_STYLES: Record<
  CategoryCardStatus,
  { dot: string; text: string; bg: string; border: string; accent: string }
> = {
  // `border` es un tono pastel pensado para el contorno del pill de estado;
  // `accent` es la variante fuerte (500) para el borde izquierdo de tarjetas/
  // filas — debe detectarse "de reojo", el pastel no alcanza para eso.
  VERDE: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    accent: 'border-emerald-500',
  },
  AMARILLO: {
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'border-amber-500',
  },
  ROJO: {
    dot: 'bg-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    accent: 'border-red-500',
  },
  SIN_DATOS: {
    dot: 'bg-navy-700/40',
    text: 'text-navy-700',
    bg: 'bg-navy-50',
    border: 'border-line-strong',
    accent: 'border-navy-700/20',
  },
}

/** Claves de i18n (no el texto ya traducido) — cada sitio de uso llama
 * `t(SEMAPHORE_LABEL_KEY[estado])` para que el label respete el idioma activo. */
export const SEMAPHORE_LABEL_KEY: Record<CategoryCardStatus, string> = {
  VERDE: 'dashboard.semaphore.cumple',
  AMARILLO: 'dashboard.semaphore.alerta',
  ROJO: 'dashboard.semaphore.critico',
  SIN_DATOS: 'dashboard.semaphore.sinDatos',
}

export const SEMAPHORE_HEX: Record<SemaphoreStatus, string> = {
  VERDE: '#10b981',
  AMARILLO: '#f59e0b',
  ROJO: '#ef4444',
}
