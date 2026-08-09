import { Car, FlaskConical, LayoutGrid } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Ícono por servicio para las listas de "Operación" (sidebar admin y
 * cliente) — antes ambos sidebars usaban `LayoutGrid` para TODOS los
 * servicios por igual, así que Higiene Industrial y Seguridad Vial se veían
 * idénticos en la misma lista (2026-08, "reemplaza los íconos duplicados").
 * Fallback genérico para cualquier servicio futuro que aún no tenga ícono
 * propio asignado acá.
 */
export function iconForService(slug: string): Component {
  if (slug === 'higiene-industrial') return FlaskConical
  if (slug === 'seguridad-vial') return Car
  return LayoutGrid
}
