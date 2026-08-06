import { ref } from 'vue'

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
}

const pending = ref<ConfirmRequest | null>(null)
let resolver: ((value: boolean) => void) | null = null

function confirm(request: ConfirmRequest): Promise<boolean> {
  pending.value = request
  return new Promise((resolve) => {
    resolver = resolve
  })
}

function resolveConfirm() {
  resolver?.(true)
  resolver = null
  pending.value = null
}

function resolveCancel() {
  resolver?.(false)
  resolver = null
  pending.value = null
}

export function useConfirm() {
  return { pending, confirm, resolveConfirm, resolveCancel }
}
