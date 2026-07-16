<script setup lang="ts">
import SocialLinks from './SocialLinks.vue'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-panel-blue-deep px-6 py-16 text-sky-100 sm:px-8 md:px-12 lg:px-16">
    <div class="mx-auto grid max-w-6xl gap-12 md:grid-cols-3">
      <div>
        <p class="font-serif text-xl font-semibold text-white">RoMa</p>
        <p class="mt-3 max-w-xs text-[13.5px] leading-relaxed text-sky-200">
          Ciencia de la complejidad y ciencia de redes aplicadas a la gestión del riesgo, la seguridad industrial y
          la higiene ocupacional.
        </p>
      </div>

      <nav class="flex flex-col gap-3 text-[13.5px]">
        <span class="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400">Navegación</span>
        <a href="#servicios" class="text-sky-100 transition-colors hover:text-white">Servicios</a>
        <a href="#metodologia" class="text-sky-100 transition-colors hover:text-white">Metodología</a>
        <a href="#nosotros" class="text-sky-100 transition-colors hover:text-white">Nosotros</a>
        <a href="#contacto" class="text-sky-100 transition-colors hover:text-white">Contacto</a>
      </nav>

      <div class="flex flex-col gap-4">
        <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400">Síguenos</span>
        <SocialLinks variant="footer" />
      </div>
    </div>

    <div class="mx-auto mt-12 max-w-6xl border-t border-white/10 pt-6 text-[12px] text-sky-200/70">
      © {{ year }} RoMa — Ciencia Aplicada. Todos los derechos reservados.
    </div>
  </footer>
</template>
