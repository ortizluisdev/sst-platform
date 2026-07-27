import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listServicesHandler, createOrganizationHandler } from './organizations.controller.js'

const PERMISSION = 'platform.organizations.manage'

export async function organizationsRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/services',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listServicesHandler,
  )

  app.post(
    '/api/admin/organizations',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    createOrganizationHandler,
  )
}
