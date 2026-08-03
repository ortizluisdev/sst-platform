import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listCategoryConfigHandler, updateCategoryConfigHandler } from './orgCategoryConfig.controller.js'

const PERMISSION = 'platform.organizations.manage'

/** Toggle por organización de las 5 categorías de Higiene Industrial (se
 * venden por separado) — ver impacto en variables.service.ts
 * (missingVariables, motor de cálculo) y variables.repository.ts (filtro
 * del catálogo antes de compararlo/usarlo). */
export async function orgCategoryConfigRoutes(app: FastifyInstance) {
  app.get<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/category-config',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listCategoryConfigHandler,
  )

  app.patch<{ Params: { organizationId: string; categoria: string } }>(
    '/api/admin/organizations/:organizationId/category-config/:categoria',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateCategoryConfigHandler,
  )
}
