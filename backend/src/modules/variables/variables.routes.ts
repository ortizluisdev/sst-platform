import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  uploadVariablesHandler,
  clientDashboardHandler,
  adminDashboardHandler,
  listOrganizationsHandler,
  listOrgServicesHandler,
  clientHistoryHandler,
  adminHistoryHandler,
  clientUploadDetailHandler,
  adminUploadDetailHandler,
  correctReadingHandler,
} from './variables.controller.js'

export async function variablesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { serviceSlug?: string } }>(
    '/api/admin/organizations',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    listOrganizationsHandler,
  )

  app.get<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/services',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    listOrgServicesHandler,
  )

  app.post<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/services/:serviceSlug/variables/upload',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
      preHandler: [requireAuth, requirePermission('platform.variables.upload')],
    },
    uploadVariablesHandler,
  )

  app.patch<{
    Params: { organizationId: string; serviceSlug: string; readingId: string }
    Body: { valor: number; reason: string }
  }>(
    '/api/admin/organizations/:organizationId/services/:serviceSlug/readings/:readingId',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
      preHandler: [requireAuth, requirePermission('platform.variables.correct')],
    },
    correctReadingHandler,
  )

  app.get<{ Params: { serviceSlug: string } }>(
    '/api/dashboard/:serviceSlug',
    { preHandler: [requireAuth] },
    clientDashboardHandler,
  )

  app.get<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    adminDashboardHandler,
  )

  app.get<{ Params: { serviceSlug: string } }>(
    '/api/dashboard/:serviceSlug/uploads',
    { preHandler: [requireAuth] },
    clientHistoryHandler,
  )

  app.get<{ Params: { organizationId: string; serviceSlug: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/uploads',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    adminHistoryHandler,
  )

  app.get<{ Params: { serviceSlug: string; uploadId: string } }>(
    '/api/dashboard/:serviceSlug/uploads/:uploadId',
    { preHandler: [requireAuth] },
    clientUploadDetailHandler,
  )

  app.get<{ Params: { organizationId: string; serviceSlug: string; uploadId: string } }>(
    '/api/admin/organizations/:organizationId/dashboard/:serviceSlug/uploads/:uploadId',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    adminUploadDetailHandler,
  )
}
