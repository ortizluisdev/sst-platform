import type { PrismaClient } from '@prisma/client'
import { createOrgCatalogsRepository } from './orgCatalogs.repository.js'
import type { CatalogTipo, CreateCatalogItemInput, UpdateCatalogItemInput } from './orgCatalogs.schema.js'

export class OrgCatalogsError extends Error {
  constructor(
    public code: 'ORG_NOT_FOUND' | 'ITEM_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createOrgCatalogsService(prisma: PrismaClient) {
  const repository = createOrgCatalogsRepository(prisma)

  async function assertOrganizationExists(organizationId: string) {
    const organization = await repository.findOrganizationById(organizationId)
    if (!organization) throw new OrgCatalogsError('ORG_NOT_FOUND', 'Empresa no encontrada')
  }

  return {
    async list(tipo: CatalogTipo, organizationId: string) {
      await assertOrganizationExists(organizationId)
      return repository.list(tipo, organizationId)
    },

    async create(tipo: CatalogTipo, organizationId: string, input: CreateCatalogItemInput) {
      await assertOrganizationExists(organizationId)
      return repository.create(tipo, organizationId, input.nombre)
    },

    async update(tipo: CatalogTipo, itemId: string, organizationId: string, input: UpdateCatalogItemInput) {
      await assertOrganizationExists(organizationId)
      const result = await repository.update(tipo, itemId, organizationId, input)
      if (result.count === 0) throw new OrgCatalogsError('ITEM_NOT_FOUND', 'Elemento no encontrado')
    },
  }
}

export type OrgCatalogsService = ReturnType<typeof createOrgCatalogsService>
