import { Lightbulb, Volume2, Thermometer, Gauge } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Mapeo puramente decorativo por palabra clave — nunca determina qué
 * pestañas existen (eso lo decide el catálogo de VariableDefinition). Si
 * una categoría de un futuro servicio no matchea ningún patrón, cae en el
 * ícono genérico sin romper nada.
 */
export function iconForCategory(categoria: string): Component {
  const key = categoria.toLowerCase()
  if (key.includes('ilumin')) return Lightbulb
  if (key.includes('ruido') || key.includes('sonor') || key.includes('acúst') || key.includes('acust')) return Volume2
  if (key.includes('térmic') || key.includes('termic') || key.includes('confort')) return Thermometer
  return Gauge
}
