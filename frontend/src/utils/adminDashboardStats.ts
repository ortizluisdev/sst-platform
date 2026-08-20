import type { OrganizationListItem, ServiceOption } from '@/types/organization'

export interface ServiceClientCount {
  slug: string
  nombre: string
  count: number
}

export type ResponsableAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'

export interface AdminDashboardStats {
  totalClientes: number
  totalServicios: number
  clientesPorServicio: ServiceClientCount[]
  cuentasPorEstado: Record<ResponsableAccountStatus, number>
}

/**
 * Agrega el dashboard general del admin (2026-08, "vista general de la
 * información que puede gestionar el administrador") — deliberadamente
 * puro: recibe los mismos datos que AdminShell.vue ya carga vía
 * listOrganizationsFull()/listActiveServices() y provee a sus rutas hijas
 * (operacionOrganizations/operacionServices), sin pedir nada nuevo al
 * backend.
 */
export function computeAdminDashboardStats(
  organizations: OrganizationListItem[],
  services: ServiceOption[],
): AdminDashboardStats {
  const clientesPorServicio: ServiceClientCount[] = services.map((service) => ({
    slug: service.slug,
    nombre: service.nombre,
    count: organizations.filter((org) => org.services.some((s) => s.slug === service.slug && s.isActive)).length,
  }))

  const cuentasPorEstado: Record<ResponsableAccountStatus, number> = {
    PENDING_ACTIVATION: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
  }
  for (const org of organizations) {
    if (org.responsable) cuentasPorEstado[org.responsable.accountStatus]++
  }

  return {
    totalClientes: organizations.length,
    totalServicios: services.length,
    clientesPorServicio,
    cuentasPorEstado,
  }
}

export interface MonthlyRegistrationCount {
  /** 'YYYY-MM' — clave estable, sin depender de locale. El componente que
   * la muestra (MonthlyCountChart.vue) es responsable de traducirla a un
   * texto localizado ("ago 2026" / "Aug 2026"). */
  label: string
  count: number
}

/**
 * Tendencia de clientes nuevos por mes, para el dashboard general de admin
 * (2026-08, "tablas gráficas y mucho más"). Trabaja enteramente en UTC (no
 * en hora local) — tanto para generar los 6 buckets de mes como para leer
 * `createdAt` de cada organización — para que un caso límite como "creado
 * el último día del mes a las 23:59" caiga siempre en el mismo bucket sin
 * importar en qué zona horaria corra el proceso (servidor, CI, o la
 * máquina de quien lo pruebe localmente).
 */
export function computeMonthlyRegistrations(
  organizations: OrganizationListItem[],
  months = 6,
  now: Date = new Date(),
): MonthlyRegistrationCount[] {
  const buckets: MonthlyRegistrationCount[] = []
  for (let i = months - 1; i >= 0; i--) {
    const bucketDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const label = `${bucketDate.getUTCFullYear()}-${String(bucketDate.getUTCMonth() + 1).padStart(2, '0')}`
    buckets.push({ label, count: 0 })
  }

  const indexByLabel = new Map(buckets.map((bucket, index) => [bucket.label, index]))
  for (const org of organizations) {
    const created = new Date(org.createdAt)
    const label = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, '0')}`
    const index = indexByLabel.get(label)
    if (index !== undefined) buckets[index]!.count++
  }

  return buckets
}
