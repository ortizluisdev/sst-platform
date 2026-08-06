import { describe, it, expect, beforeEach } from 'vitest'
import { useConfirm } from './useConfirm'

describe('useConfirm', () => {
  beforeEach(() => {
    useConfirm().resolveCancel()
  })

  it('confirm() setea pending con la request', () => {
    const { pending, confirm } = useConfirm()
    void confirm({ title: 'Eliminar', message: '¿Seguro?', confirmLabel: 'Eliminar' })
    expect(pending.value).toEqual({ title: 'Eliminar', message: '¿Seguro?', confirmLabel: 'Eliminar' })
  })

  it('resolveConfirm() resuelve la promesa en true y limpia pending', async () => {
    const { pending, confirm, resolveConfirm } = useConfirm()
    const promise = confirm({ title: 'A', message: 'B', confirmLabel: 'C' })
    resolveConfirm()
    await expect(promise).resolves.toBe(true)
    expect(pending.value).toBeNull()
  })

  it('resolveCancel() resuelve la promesa en false y limpia pending', async () => {
    const { pending, confirm, resolveCancel } = useConfirm()
    const promise = confirm({ title: 'A', message: 'B', confirmLabel: 'C' })
    resolveCancel()
    await expect(promise).resolves.toBe(false)
    expect(pending.value).toBeNull()
  })
})
