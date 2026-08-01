import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  clientListNonConformitiesHandler,
  adminListNonConformitiesHandler,
  adminCreateNonConformityHandler,
  adminUpdateNonConformityHandler,
} from './nonConformities.controller.js'

export async function nonConformitiesRoutes(app: FastifyInstance) {
  app.get<{ Params: { serviceSlug: string } }>(
    '/api/dashboard/:serviceSlug/non-conformities',
    { preHandler: [requireAuth] },
    clientListNonConformitiesHandler,
  )

  app.get<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/non-conformities',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    adminListNonConformitiesHandler,
  )

  app.post<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/non-conformities',
    { preHandler: [requireAuth, requirePermission('platform.variables.correct')] },
    adminCreateNonConformityHandler,
  )

  app.patch<{ Params: { organizationId: string; serviceSlug: string; id: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/non-conformities/:id',
    { preHandler: [requireAuth, requirePermission('platform.variables.correct')] },
    adminUpdateNonConformityHandler,
  )
}
