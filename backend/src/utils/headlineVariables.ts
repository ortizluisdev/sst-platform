/** Variable "de cabecera" por categoría — mismo mapeo que
 * frontend/src/components/dashboard/client/headlineVariables.ts (deben
 * mantenerse en sync manualmente, sin código compartido entre frontend y
 * backend en este proyecto). Una variable representativa por categoría,
 * nunca un promedio entre variables de distinta unidad. */
export const HEADLINE_CODE_POR_CATEGORIA: Record<string, string> = {
  Iluminación: 'ILU-01',
  Sonido: 'RUI-06',
  'Estrés Térmico': 'TER-03',
  'Radiación UV': 'RUV-01',
  Vibración: 'VIB-05',
}
