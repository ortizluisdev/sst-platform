import { Building2, Car, FlaskConical, LayoutGrid, Wrench, Brain } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Ícono por servicio para las listas de "Operación" (sidebar admin y
 * cliente) y el checklist de servicio contratado al crear una empresa
 * (CreateOrganizationForm.vue) — antes todos los servicios usaban
 * `LayoutGrid` por igual, incluidos los 3 del catálogo completo que solo
 * aparecen ahí (Mantenimiento Basado en Riesgo, Modelado Científico del
 * Comportamiento Social, Riesgo Mecánico y Locativo — 2026-08, "no me
 * gusta que los íconos sean iguales"). Fallback genérico para cualquier
 * servicio futuro que aún no tenga ícono propio asignado acá.
 */
export function iconForService(slug: string): Component {
  if (slug === 'higiene-industrial') return FlaskConical
  if (slug === 'seguridad-vial') return Car
  if (slug === 'mantenimiento-basado-en-riesgo') return Wrench
  if (slug === 'modelado-cientifico-comportamiento-social') return Brain
  if (slug === 'riesgo-mecanico-locativo') return Building2
  return LayoutGrid
}
