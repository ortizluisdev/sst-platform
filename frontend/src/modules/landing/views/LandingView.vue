<script setup lang="ts">
import PublicLayout from '@/layouts/PublicLayout.vue'
import { useSeoHead } from '@/composables/useSeoHead'
import HeroSection from '../components/HeroSection.vue'
import PropuestaValorSection from '../components/PropuestaValorSection.vue'
import ServiciosSection from '../components/ServiciosSection.vue'
import MetodologiaSection from '../components/MetodologiaSection.vue'
import NosotrosSection from '../components/NosotrosSection.vue'
import RomaPlusSection from '../components/RomaPlusSection.vue'
import ContactoSection from '../components/ContactoSection.vue'

useSeoHead()
</script>

<template>
  <PublicLayout>
    <HeroSection />
    <PropuestaValorSection />
    <ServiciosSection />
    <MetodologiaSection />
    <NosotrosSection />
    <RomaPlusSection />
    <ContactoSection />
  </PublicLayout>
</template>
