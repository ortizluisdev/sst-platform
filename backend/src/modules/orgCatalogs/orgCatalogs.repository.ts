import type { PrismaClient } from '@prisma/client'
import type { CatalogTipo } from './orgCatalogs.schema.js'

export function createOrgCatalogsRepository(prisma: PrismaClient) {
  return {
    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id } })
    },

    list(tipo: CatalogTipo, organizationId: string) {
      switch (tipo) {
        case 'zona':
          return prisma.orgZona.findMany({ where: { organizationId, isActive: true }, orderBy: { nombre: 'asc' } })
        case 'seccion':
          return prisma.orgSeccion.findMany({ where: { organizationId, isActive: true }, orderBy: { nombre: 'asc' } })
        case 'cargo':
          return prisma.orgCargo.findMany({ where: { organizationId, isActive: true }, orderBy: { nombre: 'asc' } })
        case 'trabajador':
          return prisma.orgTrabajador.findMany({
            where: { organizationId, isActive: true },
            orderBy: { nombre: 'asc' },
          })
      }
    },

    create(tipo: CatalogTipo, organizationId: string, nombre: string) {
      switch (tipo) {
        case 'zona':
          return prisma.orgZona.create({ data: { organizationId, nombre } })
        case 'seccion':
          return prisma.orgSeccion.create({ data: { organizationId, nombre } })
        case 'cargo':
          return prisma.orgCargo.create({ data: { organizationId, nombre } })
        case 'trabajador':
          return prisma.orgTrabajador.create({ data: { organizationId, nombre } })
      }
    },

    /** `updateMany` con organizationId en el where (no `update` por id solo)
     * para que un id de otra organización nunca pueda editarse — mismo
     * chequeo anti-IDOR que el resto del proyecto. */
    update(tipo: CatalogTipo, itemId: string, organizationId: string, data: { nombre?: string; isActive?: boolean }) {
      switch (tipo) {
        case 'zona':
          return prisma.orgZona.updateMany({ where: { id: itemId, organizationId }, data })
        case 'seccion':
          return prisma.orgSeccion.updateMany({ where: { id: itemId, organizationId }, data })
        case 'cargo':
          return prisma.orgCargo.updateMany({ where: { id: itemId, organizationId }, data })
        case 'trabajador':
          return prisma.orgTrabajador.updateMany({ where: { id: itemId, organizationId }, data })
      }
    },
  }
}

export type OrgCatalogsRepository = ReturnType<typeof createOrgCatalogsRepository>
