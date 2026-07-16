<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import logoPng from '@/assets/logo/roma-logo.png'
import logoWebp from '@/assets/logo/roma-logo.webp'

const isScrolled = ref(false)
const isNavOpen = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))

const navLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#servicios', label: 'Servicios' },
  { href: '#metodologia', label: 'Metodología' },
  { href: '#nosotros', label: 'Nosotros' },
]
</script>

<template>
  <header
    id="site-header"
    class="fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b px-6 transition-[padding,border-color] duration-[350ms] sm:px-8 md:px-12 lg:px-16"
    :class="isScrolled ? 'border-white/10 py-3.5' : 'border-transparent py-5'"
  >
    <div
      class="absolute inset-0 -z-10 backdrop-blur-[10px] transition-colors duration-[350ms]"
      :class="isScrolled ? 'bg-panel-blue-deep' : 'bg-cream/70'"
    />

    <a href="#inicio" class="flex h-16 items-center" aria-label="RoMa — Ciencia Aplicada">
      <span
        class="flex items-center rounded-lg px-2.5 py-1 transition-colors duration-[350ms]"
        :class="isScrolled ? 'bg-white' : 'bg-transparent'"
      >
        <picture>
          <source :srcset="logoWebp" type="image/webp" />
          <img :src="logoPng" alt="RoMa — Ciencia Aplicada" class="block h-10 w-auto" width="572" height="166" />
        </picture>
      </span>
    </a>

    <button
      type="button"
      class="p-1 md:hidden"
      aria-label="Abrir menú"
      :aria-expanded="isNavOpen"
      @click="isNavOpen = !isNavOpen"
    >
      <span class="my-1.5 block h-[1.5px] w-[22px]" :class="isScrolled ? 'bg-white' : 'bg-navy-900'" />
      <span class="my-1.5 block h-[1.5px] w-[22px]" :class="isScrolled ? 'bg-white' : 'bg-navy-900'" />
      <span class="my-1.5 block h-[1.5px] w-[22px]" :class="isScrolled ? 'bg-white' : 'bg-navy-900'" />
    </button>

    <nav
      id="mainNav"
      class="fixed inset-y-0 right-0 z-[100] flex w-[min(78vw,300px)] flex-col items-start justify-center gap-7 bg-cream p-10 shadow-[-8px_0_30px_rgba(11,26,51,0.08)] transition-transform duration-300 md:static md:w-auto md:translate-x-0 md:flex-row md:items-center md:gap-[clamp(18px,3vw,36px)] md:bg-transparent md:p-0 md:shadow-none"
      :class="isNavOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <a
        v-for="link in navLinks"
        :key="link.href"
        :href="link.href"
        class="relative pb-1 text-[17px] font-medium tracking-wide text-navy-900 no-underline after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-sky-400 after:transition-[width] after:duration-[250ms] hover:after:w-full md:text-sm"
        :class="isScrolled ? 'md:text-white' : ''"
        @click="isNavOpen = false"
      >
        {{ link.label }}
      </a>
      <a
        href="#contacto"
        class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-sky-400 to-navy-500 px-5 py-2.5 text-[13px] font-bold tracking-wide text-white shadow-[0_4px_14px_rgba(46,84,144,0.35)] transition-all duration-[250ms] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(46,84,144,0.45)]"
        @click="isNavOpen = false"
      >
        RoMa+
      </a>
    </nav>
  </header>
</template>
