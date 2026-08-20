import { describe, it, expect } from 'vitest'
import { computeAdminDashboardStats, computeMonthlyRegistrations } from './adminDashboardStats'
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

describe('computeMonthlyRegistrations', () => {
  const NOW = new Date('2026-08-20T12:00:00.000Z')

  it('devuelve 6 meses en orden cronológico, más reciente al final', () => {
    const result = computeMonthlyRegistrations([], 6, NOW)
    expect(result.map((r) => r.label)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'])
  })

  it('sin organizaciones, todos los meses en 0', () => {
    const result = computeMonthlyRegistrations([], 6, NOW)
    expect(result.every((r) => r.count === 0)).toBe(true)
  })

  it('cuenta organizaciones creadas en meses distintos', () => {
    const orgs = [
      makeOrg({ id: 'a', createdAt: '2026-08-02T13:49:38.531Z' }),
      makeOrg({ id: 'b', createdAt: '2026-08-09T14:20:13.400Z' }),
      makeOrg({ id: 'c', createdAt: '2026-06-15T00:00:00.000Z' }),
    ]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.count]))
    expect(byLabel['2026-08']).toBe(2)
    expect(byLabel['2026-06']).toBe(1)
    expect(byLabel['2026-07']).toBe(0)
  })

  it('organización creada el primer día del mes cae en ese mes', () => {
    const orgs = [makeOrg({ id: 'a', createdAt: '2026-07-01T00:00:00.000Z' })]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.count]))
    expect(byLabel['2026-07']).toBe(1)
  })

  it('organización creada el último día del mes (justo antes de medianoche UTC) cae en ese mes', () => {
    const orgs = [makeOrg({ id: 'a', createdAt: '2026-07-31T23:59:59.999Z' })]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.count]))
    expect(byLabel['2026-07']).toBe(1)
  })

  it('organización creada antes del rango de 6 meses no se cuenta en ningún bucket', () => {
    const orgs = [makeOrg({ id: 'a', createdAt: '2025-01-01T00:00:00.000Z' })]
    const result = computeMonthlyRegistrations(orgs, 6, NOW)
    expect(result.every((r) => r.count === 0)).toBe(true)
  })
})
