/**
 * Chart.js necesita strings de color literales (no clases de Tailwind).
 * Estos valores deben mantenerse en sync manualmente con el bloque @theme
 * de src/style.css — es la misma paleta autorizada, solo en formato hex/rgba
 * para pasarle a la config de Chart.js.
 */
export const CHART_PALETTE = {
  navy900: '#0b1a33',
  navy700: '#1e3a66',
  sky400: '#5b8dc7',
  line: '#e4e7ed',
} as const

/** rgba de sky-400 en distintas opacidades, para el relleno en degradado. */
export const CHART_SKY_RGBA = (alpha: number) => `rgba(91, 141, 199, ${alpha})`

/** Tooltip consistente en todas las gráficas del dashboard. */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: CHART_PALETTE.navy900,
  titleColor: '#ffffff',
  bodyColor: '#ffffff',
  cornerRadius: 8,
  padding: 10,
  displayColors: false,
  titleFont: { family: 'Inter', weight: 600 as const },
  bodyFont: { family: 'Inter' },
} as const
