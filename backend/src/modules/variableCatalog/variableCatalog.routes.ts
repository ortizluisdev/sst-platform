import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listVariableCatalogHandler, updateVariableCatalogHandler } from './variableCatalog.controller.js'

const PERMISSION = 'platform.variables.manage'

export async function variableCatalogRoutes(app: FastifyInstance) {
  app.get<{ Params: { serviceSlug: string } }>(
    '/api/admin/services/:serviceSlug/variables',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listVariableCatalogHandler,
  )

  app.patch<{ Params: { serviceSlug: string; variableId: string } }>(
    '/api/admin/services/:serviceSlug/variables/:variableId',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateVariableCatalogHandler,
  )
}
