import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormField from './FormField.vue'

describe('FormField', () => {
  it('sin error: borde normal, sin aria-invalid, sin texto de error', () => {
    const wrapper = mount(FormField, { props: { id: 'f1', label: 'Nombre' } })
    const input = wrapper.get('input')
    expect(input.classes()).not.toContain('border-red-400')
    expect(input.attributes('aria-invalid')).toBe('false')
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('con error: agrega border-red-400, aria-invalid true, y NO renderiza texto de error', () => {
    const wrapper = mount(FormField, { props: { id: 'f1', label: 'Nombre', error: 'Campo requerido' } })
    const input = wrapper.get('input')
    expect(input.classes()).toContain('border-red-400')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).not.toContain('Campo requerido')
  })
})
