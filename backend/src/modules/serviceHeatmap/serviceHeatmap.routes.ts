import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { clientGetHeatmapHandler, adminGetHeatmapHandler, adminSaveHeatmapHandler } from './serviceHeatmap.controller.js'

export async function serviceHeatmapRoutes(app: FastifyInstance) {
  app.get<{ Params: { serviceSlug: string } }>(
    '/api/dashboard/:serviceSlug/heatmap',
    { preHandler: [requireAuth] },
    clientGetHeatmapHandler,
  )

  app.get<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/heatmap',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    adminGetHeatmapHandler,
  )

  app.patch<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/heatmap',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
      preHandler: [requireAuth, requirePermission('platform.variables.upload')],
    },
    adminSaveHeatmapHandler,
  )
}
