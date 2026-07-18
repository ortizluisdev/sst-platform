import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccordionPanel, { type AccordionItem } from './AccordionPanel.vue'

const items: AccordionItem[] = [
  {
    id: 'a',
    num: '01',
    label: 'First',
    iconMini: '<svg />',
    iconBig: '<svg />',
    title: 'First',
    tagline: 'First tagline',
  },
  {
    id: 'b',
    num: '02',
    label: 'Second',
    iconMini: '<svg />',
    iconBig: '<svg />',
    title: 'Second',
    tagline: 'Second tagline',
  },
  {
    id: 'c',
    num: '03',
    label: 'Third',
    iconMini: '<svg />',
    iconBig: '<svg />',
    title: 'Third',
    tagline: 'Third tagline',
  },
]

function mountPanel() {
  return mount(AccordionPanel, { props: { items } })
}

describe('AccordionPanel', () => {
  it('starts with the first item active by default', () => {
    const wrapper = mountPanel()
    const articles = wrapper.findAll('article')
    expect(articles[0]?.attributes('aria-expanded')).toBe('true')
    expect(articles[1]?.attributes('aria-expanded')).toBe('false')
  })

  it('is keyboard-focusable and exposes button semantics (regression test for the a11y audit fix)', () => {
    const wrapper = mountPanel()
    for (const article of wrapper.findAll('article')) {
      expect(article.attributes('role')).toBe('button')
      expect(article.attributes('tabindex')).toBe('0')
    }
  })

  it('activates an item on click', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('article')[1]?.trigger('click')
    expect(wrapper.findAll('article')[1]?.attributes('aria-expanded')).toBe('true')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])
  })

  it('activates an item on Enter key (keyboard-only interaction)', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('article')[2]?.trigger('keydown.enter')
    expect(wrapper.findAll('article')[2]?.attributes('aria-expanded')).toBe('true')
  })

  it('activates an item on Space key (keyboard-only interaction)', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('article')[1]?.trigger('keydown.space')
    expect(wrapper.findAll('article')[1]?.attributes('aria-expanded')).toBe('true')
  })

  it('does not re-emit when activating the already-active item', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('article')[0]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
