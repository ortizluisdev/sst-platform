/** Redondea un valor numérico para texto generado (descripciones de no
 * conformidades, mensajes de notificación, correos de alerta) — evita
 * interpolar la precisión completa de punto flotante que trae la lectura
 * cruda (ej. 99.69889997833323 → 99.7). Math.round en vez de toFixed para
 * no dejar ceros de relleno (99.7, no 99.70; 100, no 100.0).
 *
 * Distinto de round2() en variables.service.ts, que redondea a 2 decimales
 * como parte del CÁLCULO de un promedio almacenado/retornado — esta función
 * es solo para formatear texto de cara al usuario, nunca para derivar un
 * valor que se guarda o se usa en otro cálculo. */
export function roundDisplay(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
