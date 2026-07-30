/** true si un color hex #rrggbb es "oscuro" — luminancia relativa perceptual
 * por debajo del punto medio, umbral suficiente para decidir si el texto que
 * va encima debe ser claro (blanco) u oscuro (navy), sin necesitar el cálculo
 * WCAG completo con gamma-correction (esto es una heurística visual, no un
 * chequeo de accesibilidad AA/AAA). */
export function isDarkColor(hex: string): boolean {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) return false

  const [r, g, b] = [match[1], match[2], match[3]].map((h) => parseInt(h, 16))
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.5
}
