import type { HigieneCategoria, PrismaClient } from '@prisma/client'
import { createOrgCategoryConfigRepository } from './orgCategoryConfig.repository.js'
import { TODAS_LAS_CATEGORIAS } from '../../utils/higieneCategorias.js'

export class OrgCategoryConfigError extends Error {
  constructor(
    public code: 'ORG_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createOrgCategoryConfigService(prisma: PrismaClient) {
  const repository = createOrgCategoryConfigRepository(prisma)

  async function assertOrganizationExists(organizationId: string) {
    const organization = await repository.findOrganizationById(organizationId)
    if (!organization) throw new OrgCategoryConfigError('ORG_NOT_FOUND', 'Empresa no encontrada')
  }

  return {
    /** Siempre devuelve las 5 categorías, en el mismo orden — si por algún
     * motivo faltara una fila en BD (no debería, ver createWithResponsible
     * y la migración de backfill), se completa como habilitada=true: mismo
     * default explícito que ya se decidió para el resto de organizaciones,
     * no un valor inventado nuevo. */
    async list(organizationId: string) {
      await assertOrganizationExists(organizationId)
      const rows = await repository.list(organizationId)
      const byCategoria = new Map(rows.map((r) => [r.categoria, r.habilitada]))
      return TODAS_LAS_CATEGORIAS.map((categoria) => ({
        categoria,
        habilitada: byCategoria.get(categoria) ?? true,
      }))
    },

    async setHabilitada(organizationId: string, categoria: HigieneCategoria, habilitada: boolean) {
      await assertOrganizationExists(organizationId)
      return repository.setHabilitada(organizationId, categoria, habilitada)
    },
  }
}

export type OrgCategoryConfigService = ReturnType<typeof createOrgCategoryConfigService>
