/** Variable "de cabecera" por categoría, según Hoja 1 · Dashboard del reporte
 * fuente (variablesdash1.xlsx) — una variable representativa por categoría,
 * nunca un promedio entre variables de distinta unidad. Mapeo por término
 * técnico real (LEX,8h = nivel de exposición diaria; ahv = aceleración
 * ponderada mano-brazo), no arbitrario. */
export const HEADLINE_CODE_POR_CATEGORIA: Record<string, string> = {
  Iluminación: 'ILU-01',
  Sonido: 'RUI-06',
  'Estrés Térmico': 'TER-03',
  'Radiación UV': 'RUV-01',
  Vibración: 'VIB-05',
}
