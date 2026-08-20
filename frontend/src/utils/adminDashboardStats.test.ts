import { describe, it, expect } from 'vitest'
import { computeAdminDashboardStats } from './adminDashboardStats'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'

function makeOrg(overrides: Partial<OrganizationListItem> = {}): OrganizationListItem {
  return {
    id: 'org-1',
    nombre: 'Empresa 1',
    nit: '900123456',
    contactEmail: 'contacto@empresa1.com',
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    primaryColor: null,
    secondaryColor: null,
    services: [],
    responsable: {
      id: 'user-1',
      nombre: 'Responsable 1',
      documentType: 'CC',
      documentNumber: '123456',
      email: 'resp@empresa1.com',
      accountStatus: 'ACTIVE',
      suspendReason: null,
    },
    ...overrides,
  }
}

const SERVICES: ServiceOption[] = [
  { slug: 'higiene-industrial', nombre: 'Higiene Industrial' },
  { slug: 'seguridad-vial', nombre: 'Seguridad Vial' },
]

describe('computeAdminDashboardStats', () => {
  it('cuenta el total de organizaciones recibidas', () => {
    const orgs = [makeOrg({ id: 'a' }), makeOrg({ id: 'b' }), makeOrg({ id: 'c' })]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.totalClientes).toBe(3)
  })

  it('cuenta el total de servicios recibidos', () => {
    const stats = computeAdminDashboardStats([], SERVICES)
    expect(stats.totalServicios).toBe(2)
  })

  it('cuenta clientes por servicio, solo contrataciones activas', () => {
    const orgs = [
      makeOrg({
        id: 'a',
        services: [
          { slug: 'higiene-industrial', nombre: 'Higiene Industrial', isActive: true },
          { slug: 'seguridad-vial', nombre: 'Seguridad Vial', isActive: false },
        ],
      }),
      makeOrg({
        id: 'b',
        services: [{ slug: 'higiene-industrial', nombre: 'Higiene Industrial', isActive: true }],
      }),
      makeOrg({ id: 'c', services: [] }),
    ]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.clientesPorServicio).toEqual([
      { slug: 'higiene-industrial', nombre: 'Higiene Industrial', count: 2 },
      { slug: 'seguridad-vial', nombre: 'Seguridad Vial', count: 0 },
    ])
  })

  it('desglosa cuentas por estado del responsable', () => {
    const orgs = [
      makeOrg({ id: 'a', responsable: { ...makeOrg().responsable!, accountStatus: 'ACTIVE' } }),
      makeOrg({ id: 'b', responsable: { ...makeOrg().responsable!, accountStatus: 'PENDING_ACTIVATION' } }),
      makeOrg({ id: 'c', responsable: { ...makeOrg().responsable!, accountStatus: 'SUSPENDED' } }),
      makeOrg({ id: 'd', responsable: { ...makeOrg().responsable!, accountStatus: 'ACTIVE' } }),
    ]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.cuentasPorEstado).toEqual({ ACTIVE: 2, PENDING_ACTIVATION: 1, SUSPENDED: 1 })
  })

  it('organización sin responsable no rompe el conteo y no se cuenta en ningún estado', () => {
    const orgs = [makeOrg({ id: 'a', responsable: null })]
    const stats = computeAdminDashboardStats(orgs, SERVICES)
    expect(stats.cuentasPorEstado).toEqual({ ACTIVE: 0, PENDING_ACTIVATION: 0, SUSPENDED: 0 })
    expect(stats.totalClientes).toBe(1)
  })

  it('sin organizaciones ni servicios, todo en cero sin lanzar error', () => {
    const stats = computeAdminDashboardStats([], [])
    expect(stats).toEqual({
      totalClientes: 0,
      totalServicios: 0,
      clientesPorServicio: [],
      cuentasPorEstado: { ACTIVE: 0, PENDING_ACTIVATION: 0, SUSPENDED: 0 },
    })
  })
})
