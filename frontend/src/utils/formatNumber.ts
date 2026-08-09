/** Redondea un valor numérico para mostrar (mediciones, porcentajes, índices)
 * — evita renderizar la precisión completa de punto flotante que trae la
 * base de datos (ej. 99.69889997833323 → 99.7). Usa Math.round en vez de
 * toFixed para no dejar ceros de relleno (99.7, no 99.70; 100, no 100.0). */
export function roundDisplay(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
