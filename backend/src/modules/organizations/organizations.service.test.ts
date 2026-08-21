import { describe, it, expect } from 'vitest'
import { computeServiceDiff } from './organizations.service.js'

describe('computeServiceDiff', () => {
  it('servicio nuevo (no existía ninguna fila) → se agrega a toGrant', () => {
    const result = computeServiceDiff([], ['higiene-industrial'])
    expect(result).toEqual({ toGrant: ['higiene-industrial'], toRevoke: [] })
  })

  it('servicio ya activo y sigue en la lista deseada → no aparece en ningún lado', () => {
    const current = [{ slug: 'higiene-industrial', isActive: true }]
    const result = computeServiceDiff(current, ['higiene-industrial'])
    expect(result).toEqual({ toGrant: [], toRevoke: [] })
  })

  it('servicio activo que ya NO está en la lista deseada → se agrega a toRevoke', () => {
    const current = [{ slug: 'higiene-industrial', isActive: true }, { slug: 'seguridad-vial', isActive: true }]
    const result = computeServiceDiff(current, ['higiene-industrial'])
    expect(result).toEqual({ toGrant: [], toRevoke: ['seguridad-vial'] })
  })

  it('servicio que estaba desactivado (quitado antes) y vuelve a la lista deseada → se reactiva vía toGrant', () => {
    const current = [{ slug: 'seguridad-vial', isActive: false }]
    const result = computeServiceDiff(current, ['seguridad-vial'])
    expect(result).toEqual({ toGrant: ['seguridad-vial'], toRevoke: [] })
  })

  it('servicio inactivo que NO está en la lista deseada → no se toca (ya está fuera, no hay nada que revocar dos veces)', () => {
    const current = [{ slug: 'seguridad-vial', isActive: false }]
    const result = computeServiceDiff(current, [])
    expect(result).toEqual({ toGrant: [], toRevoke: [] })
  })

  it('mezcla: uno se agrega, uno se mantiene, uno se quita', () => {
    const current = [
      { slug: 'higiene-industrial', isActive: true },
      { slug: 'seguridad-vial', isActive: true },
    ]
    const result = computeServiceDiff(current, ['higiene-industrial', 'mantenimiento-basado-en-riesgo'])
    expect(result.toGrant).toEqual(['mantenimiento-basado-en-riesgo'])
    expect(result.toRevoke).toEqual(['seguridad-vial'])
  })

  it('lista deseada vacía y sin nada activo → ambos arrays vacíos, sin lanzar error', () => {
    expect(computeServiceDiff([], [])).toEqual({ toGrant: [], toRevoke: [] })
  })
})
