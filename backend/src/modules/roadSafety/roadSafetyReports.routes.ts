import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { adminGeneratePdfHandler, clientGeneratePdfHandler, adminGenerateCsvHandler, clientGenerateCsvHandler } from './roadSafetyReports.controller.js'

export async function roadSafetyReportsRoutes(app: FastifyInstance) {
  const rateLimit = { max: 20, timeWindow: '15 minutes' }

  app.post('/api/road-safety/reports/pdf', { preHandler: [requireAuth], config: { rateLimit } }, clientGeneratePdfHandler)
  app.post<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/road-safety/reports/pdf',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')], config: { rateLimit } },
    adminGeneratePdfHandler,
  )
  app.post('/api/road-safety/reports/csv', { preHandler: [requireAuth], config: { rateLimit } }, clientGenerateCsvHandler)
  app.post<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/road-safety/reports/csv',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')], config: { rateLimit } },
    adminGenerateCsvHandler,
  )
}
