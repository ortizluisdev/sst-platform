import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

const DURATIONS: Record<ToastItem['type'], number> = { success: 4000, error: 6000 }

const toasts = ref<ToastItem[]>([])
let nextId = 0

function dismiss(id: number) {
  const index = toasts.value.findIndex((toast) => toast.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function push(type: ToastItem['type'], message: string) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  setTimeout(() => dismiss(id), DURATIONS[type])
}

export function useToast() {
  return {
    toasts,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    dismiss,
  }
}
