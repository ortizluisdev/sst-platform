import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  clientGeneratePdfHandler,
  adminGeneratePdfHandler,
  clientGenerateCsvHandler,
  adminGenerateCsvHandler,
} from './reports.controller.js'

export async function reportsRoutes(app: FastifyInstance) {
  app.post<{ Params: { serviceSlug: string } }>(
    '/api/dashboard/:serviceSlug/reports/pdf',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } }, preHandler: [requireAuth] },
    clientGeneratePdfHandler,
  )

  app.post<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/reports/pdf',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
      preHandler: [requireAuth, requirePermission('platform.dashboards.view')],
    },
    adminGeneratePdfHandler,
  )

  app.post<{ Params: { serviceSlug: string } }>(
    '/api/dashboard/:serviceSlug/reports/csv',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } }, preHandler: [requireAuth] },
    clientGenerateCsvHandler,
  )

  app.post<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/reports/csv',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
      preHandler: [requireAuth, requirePermission('platform.dashboards.view')],
    },
    adminGenerateCsvHandler,
  )
}
