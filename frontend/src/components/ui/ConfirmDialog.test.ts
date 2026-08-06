import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ConfirmDialog from './ConfirmDialog.vue'
import { useConfirm } from '@/composables/useConfirm'

const i18n = createI18n({
  legacy: false,
  locale: 'es',
  messages: { es: { common: { cancel: 'Cancelar' } } },
})

function mountDialog() {
  return mount(ConfirmDialog, { global: { plugins: [i18n] } })
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    useConfirm().resolveCancel()
  })

  it('no renderiza nada cuando no hay confirmación pendiente', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('renderiza título, mensaje y texto del botón cuando hay una pendiente', () => {
    void useConfirm().confirm({ title: 'Desactivar', message: '¿Seguro?', confirmLabel: 'Desactivar' })
    const wrapper = mountDialog()
    const dialog = wrapper.get('[role="alertdialog"]')
    expect(dialog.text()).toContain('Desactivar')
    expect(dialog.text()).toContain('¿Seguro?')
  })

  it('clic en confirmar resuelve la promesa en true', async () => {
    const promise = useConfirm().confirm({ title: 'A', message: 'B', confirmLabel: 'Sí, eliminar' })
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="confirm-accept"]').trigger('click')
    await expect(promise).resolves.toBe(true)
  })

  it('clic en cancelar resuelve la promesa en false', async () => {
    const promise = useConfirm().confirm({ title: 'A', message: 'B', confirmLabel: 'Sí, eliminar' })
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="confirm-cancel"]').trigger('click')
    await expect(promise).resolves.toBe(false)
  })
})
