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
