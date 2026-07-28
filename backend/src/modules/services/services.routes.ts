import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listServicesHandler, createServiceHandler, updateServiceHandler } from './services.controller.js'

const PERMISSION = 'platform.services.manage'

export async function servicesRoutes(app: FastifyInstance) {
  app.get('/api/admin/services', { preHandler: [requireAuth, requirePermission(PERMISSION)] }, listServicesHandler)

  app.post('/api/admin/services', { preHandler: [requireAuth, requirePermission(PERMISSION)] }, createServiceHandler)

  app.patch(
    '/api/admin/services/:serviceId',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateServiceHandler,
  )
}
