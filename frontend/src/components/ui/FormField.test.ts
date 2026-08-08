import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import FormField from './FormField.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'es',
  messages: { es: { common: { showPassword: 'Mostrar contraseña', hidePassword: 'Ocultar contraseña' } } },
})

function mountField(props: Record<string, unknown>) {
  return mount(FormField, { props: { id: 'f1', label: 'Nombre', ...props }, global: { plugins: [i18n] } })
}

describe('FormField', () => {
  it('sin error: borde normal, sin aria-invalid, sin texto de error', () => {
    const wrapper = mountField({})
    const input = wrapper.get('input')
    expect(input.classes()).not.toContain('border-red-400')
    expect(input.attributes('aria-invalid')).toBe('false')
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('con error: agrega border-red-400, aria-invalid true, y NO renderiza texto de error', () => {
    const wrapper = mountField({ error: 'Campo requerido' })
    const input = wrapper.get('input')
    expect(input.classes()).toContain('border-red-400')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).not.toContain('Campo requerido')
  })

  it('type=text: no renderiza el botón de mostrar/ocultar', () => {
    const wrapper = mountField({ type: 'text' })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('type=password: renderiza el botón, empieza oculto, y alterna a texto plano al hacer clic', async () => {
    const wrapper = mountField({ type: 'password' })
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('password')

    const toggle = wrapper.get('button')
    expect(toggle.attributes('aria-label')).toBe('Mostrar contraseña')

    await toggle.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Ocultar contraseña')

    await toggle.trigger('click')
    expect(input.attributes('type')).toBe('password')
  })
})
