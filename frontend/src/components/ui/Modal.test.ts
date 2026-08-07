// frontend/src/components/ui/Modal.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import Modal from './Modal.vue'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es, en } })

describe('Modal', () => {
  it('renderiza el título por defecto y el slot', () => {
    const wrapper = mount(Modal, {
      props: { title: 'Editar cliente' },
      slots: { default: '<p>contenido</p>' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.get('h2').text()).toBe('Editar cliente')
    expect(wrapper.html()).toContain('contenido')
  })

  it('renderiza el slot header en vez del título por defecto, si se pasa', () => {
    const wrapper = mount(Modal, {
      props: { title: 'ignorado' },
      slots: { header: '<div><h2>Custom</h2><p>Subtítulo</p></div>', default: 'x' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.html()).toContain('Custom')
    expect(wrapper.html()).toContain('Subtítulo')
  })

  it('aplica max-width md por defecto y el pasado por prop', () => {
    const wrapper = mount(Modal, { props: { title: 't' }, global: { plugins: [i18n] } })
    expect(wrapper.find('.max-w-md').exists()).toBe(true)
    const wrapper2 = mount(Modal, { props: { title: 't', maxWidth: '2xl' }, global: { plugins: [i18n] } })
    expect(wrapper2.find('.max-w-2xl').exists()).toBe(true)
  })

  it('clic en el botón cerrar emite close', async () => {
    const wrapper = mount(Modal, { props: { title: 't' }, global: { plugins: [i18n] } })
    await wrapper.get('button[aria-label]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clic en el backdrop (fuera del panel) emite close', async () => {
    const wrapper = mount(Modal, { props: { title: 't' }, global: { plugins: [i18n] } })
    await wrapper.get('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
