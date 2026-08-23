import { getClientDashboard } from '@/services/dashboard.service'
import { getRoadSafetyHoja1 } from '@/services/roadSafety.service'

/** Resuelve la métrica de cumplimiento más importante de un servicio
 * contratado, para la tarjeta de resumen de `ClientHomeView.vue` — cada
 * servicio expone su dato por un endpoint distinto (no existe un endpoint
 * agregado genérico), así que este adaptador centraliza el mapeo
 * slug → de dónde sacar el número, en vez de esparcir ese switch dentro del
 * componente. Si el slug no está contemplado (servicio futuro no mapeado
 * todavía), devuelve `null` — la tarjeta se sigue mostrando (ícono +
 * nombre), solo sin el número de cumplimiento, nunca rompe la pantalla. */
export async function fetchServiceComplianceSummary(slug: string): Promise<number | null> {
  if (slug === 'higiene-industrial') {
    const dashboard = await getClientDashboard(slug)
    return dashboard.globalCompliance.pct
  }
  if (slug === 'seguridad-vial') {
    const hoja1 = await getRoadSafetyHoja1({})
    return hoja1.cumplimientoPesvGlobal
  }
  return null
}
