import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToast().toasts.value.splice(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('success() agrega un toast tipo success y lo autodescarta a los 4000ms', () => {
    const { toasts, success } = useToast()
    success('Guardado correctamente')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ type: 'success', message: 'Guardado correctamente' })
    vi.advanceTimersByTime(3999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('error() agrega un toast tipo error y lo autodescarta a los 6000ms', () => {
    const { toasts, error } = useToast()
    error('No se pudo guardar')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ type: 'error', message: 'No se pudo guardar' })
    vi.advanceTimersByTime(5999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('dismiss(id) quita el toast antes de que expire el timer', () => {
    const { toasts, success, dismiss } = useToast()
    success('X')
    const id = toasts.value[0].id
    dismiss(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('cada toast tiene un id distinto, apilables', () => {
    const { toasts, success, error } = useToast()
    success('A')
    error('B')
    expect(toasts.value).toHaveLength(2)
    expect(toasts.value[0].id).not.toBe(toasts.value[1].id)
  })
})
