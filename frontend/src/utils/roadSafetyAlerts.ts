import type { RoadSafetyVehiculo, RoadSafetyConductor } from '@/types/roadSafety'

export interface RoadSafetyAlertItem {
  severity: 'critical' | 'warning'
  title: string
  detail: string
}

/** Construye la lista combinada de alertas activas (vehículos + conductores)
 * con detalle legible, para la card "Alertas activas" de Hoja 1 — a
 * diferencia de `RoadSafetyAlertasPanel` (solo contadores), esto arma un
 * título + descripción por cada vehículo/conductor en estado ALERTA o
 * VENCIDO/LICENCIA_VENCIDA, replicando el criterio de clasificación que ya
 * usa el backend (ver roadSafetyCalculations.ts) sin volver a calcularlo —
 * solo lee los campos `alerta`/`dias*`/`comparendos`/etc. ya calculados que
 * llegan en `hoja2`/`hoja3`. Recibe `t` como parámetro (mismo patrón que
 * `buildDashboardTabs`) para que el texto final respete el idioma activo
 * sin acoplar este archivo a Vue/vue-i18n. */
export function buildRoadSafetyAlerts(
  vehiculos: RoadSafetyVehiculo[],
  conductores: RoadSafetyConductor[],
  t: (key: string, params?: Record<string, unknown>) => string,
): RoadSafetyAlertItem[] {
  const items: RoadSafetyAlertItem[] = []

  for (const v of vehiculos) {
    if (v.alerta === 'VENCIDO') {
      items.push({
        severity: 'critical',
        title: t('roadSafety.resumen.alertVehiculoVencidoTitle', { placa: v.placa }),
        detail: [
          v.diasSoat != null && v.diasSoat <= 0 ? t('roadSafety.resumen.alertSoatVencido') : null,
          v.diasRtm != null && v.diasRtm <= 0 ? t('roadSafety.resumen.alertRtmVencido') : null,
        ]
          .filter((x): x is string => x != null)
          .join(' · '),
      })
    } else if (v.alerta === 'ALERTA') {
      items.push({
        severity: 'warning',
        title: t('roadSafety.resumen.alertVehiculoAlertaTitle', { placa: v.placa }),
        detail: [
          v.diasSoat != null && v.diasSoat > 0 && v.diasSoat <= 30
            ? t('roadSafety.resumen.alertSoatPorVencer', { dias: v.diasSoat })
            : null,
          v.diasRtm != null && v.diasRtm > 0 && v.diasRtm <= 30
            ? t('roadSafety.resumen.alertRtmPorVencer', { dias: v.diasRtm })
            : null,
          v.comparendos > 0 ? t('roadSafety.resumen.alertComparendos', { cantidad: v.comparendos }) : null,
          v.kmActual != null && v.kmProxMant != null && v.kmActual >= v.kmProxMant
            ? t('roadSafety.resumen.alertMantenimiento')
            : null,
          v.anomaliaConsumoPct != null && v.anomaliaConsumoPct >= 15
            ? t('roadSafety.resumen.alertAnomalia', { pct: v.anomaliaConsumoPct })
            : null,
          v.llantasLabradoMm != null && v.llantasLabradoMm < 2
            ? t('roadSafety.resumen.alertLlantas', { mm: v.llantasLabradoMm })
            : null,
        ]
          .filter((x): x is string => x != null)
          .join(' · '),
      })
    }
  }

  for (const c of conductores) {
    if (c.alerta === 'LICENCIA_VENCIDA') {
      items.push({
        severity: 'critical',
        title: t('roadSafety.resumen.alertConductorVencidoTitle', { nombre: c.nombre }),
        detail: t('roadSafety.resumen.alertLicenciaVencida', { dias: Math.abs(c.diasLicencia ?? 0) }),
      })
    } else if (c.alerta === 'ALERTA') {
      items.push({
        severity: 'warning',
        title: t('roadSafety.resumen.alertConductorAlertaTitle', { nombre: c.nombre }),
        detail: [
          c.diasLicencia != null && c.diasLicencia > 0 && c.diasLicencia <= 30
            ? t('roadSafety.resumen.alertLicenciaPorVencer', { dias: c.diasLicencia })
            : null,
          c.icc != null && c.icc < 70 ? t('roadSafety.resumen.alertIccBajo', { icc: c.icc }) : null,
        ]
          .filter((x): x is string => x != null)
          .join(' · '),
      })
    }
  }

  const severityOrder: Record<RoadSafetyAlertItem['severity'], number> = { critical: 0, warning: 1 }
  return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
