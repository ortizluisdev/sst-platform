import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ToastContainer from './ToastContainer.vue'
import { useToast } from '@/composables/useToast'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es, en } })

function mountContainer() {
  return mount(ToastContainer, { global: { plugins: [i18n] } })
}

describe('ToastContainer', () => {
  beforeEach(() => {
    // `toasts` se expone como readonly desde useToast(); splice() directo es un no-op.
    // Se limpia usando la API pública (dismiss) para evitar fugas de estado entre tests.
    const { toasts, dismiss } = useToast()
    ;[...toasts.value].forEach((toast) => dismiss(toast.id))
  })

  it('no renderiza nada cuando no hay toasts', () => {
    const wrapper = mountContainer()
    expect(wrapper.findAll('[role="status"], [role="alert"]')).toHaveLength(0)
  })

  it('renderiza un toast de éxito con role="status" y el mensaje', () => {
    useToast().success('Guardado correctamente')
    const wrapper = mountContainer()
    const el = wrapper.get('[role="status"]')
    expect(el.text()).toContain('Guardado correctamente')
  })

  it('renderiza un toast de error con role="alert"', () => {
    useToast().error('No se pudo guardar')
    const wrapper = mountContainer()
    const el = wrapper.get('[role="alert"]')
    expect(el.text()).toContain('No se pudo guardar')
  })

  it('el botón de cierre manual llama dismiss()', async () => {
    useToast().success('X')
    const wrapper = mountContainer()
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    await wrapper.get('button').trigger('click')
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
  })
})
