import { Lightbulb, Volume2, Thermometer, Sun, Vibrate, Gauge } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Mapeo puramente decorativo por palabra clave — nunca determina qué
 * pestañas existen (eso lo decide el catálogo de VariableDefinition). Si
 * una categoría de un futuro servicio no matchea ningún patrón, cae en el
 * ícono genérico sin romper nada.
 *
 * Bug real (2026-08, "hay definiciones con mismos íconos"): la clave real
 * de la categoría "Sonido" (ver headlineVariables.ts) es literalmente
 * "Sonido", que NO contiene "ruido"/"sonor"/"acúst" — así que nunca
 * matcheaba y caía en el genérico `Gauge`, igual que Radiación UV y
 * Vibración (que tampoco tenían patrón propio) — las 3 terminaban con el
 * mismo ícono en sidebar y tarjetas. Ahora cada una tiene el suyo.
 */
export function iconForCategory(categoria: string): Component {
  const key = categoria.toLowerCase()
  if (key.includes('ilumin')) return Lightbulb
  if (key.includes('sonid') || key.includes('ruido') || key.includes('sonor') || key.includes('acúst') || key.includes('acust'))
    return Volume2
  if (key.includes('térmic') || key.includes('termic') || key.includes('confort')) return Thermometer
  if (key.includes('radiaci') || key.includes('uv')) return Sun
  if (key.includes('vibraci')) return Vibrate
  return Gauge
}

/** Clase Tailwind de color a juego con `iconForCategory` — mismo criterio
 * de palabra clave, para que el ícono de cada categoría tenga un color
 * propio y distinguible en vez de todos en el mismo azul genérico (2026-08,
 * ClientAnalisisTab.vue, "colocale más colorcitos"). */
export function iconColorForCategory(categoria: string): string {
  const key = categoria.toLowerCase()
  if (key.includes('ilumin')) return 'text-amber-500'
  if (key.includes('sonid') || key.includes('ruido') || key.includes('sonor') || key.includes('acúst') || key.includes('acust'))
    return 'text-sky-500'
  if (key.includes('térmic') || key.includes('termic') || key.includes('confort')) return 'text-red-500'
  if (key.includes('radiaci') || key.includes('uv')) return 'text-orange-500'
  if (key.includes('vibraci')) return 'text-violet-500'
  return 'text-sky-400'
}
