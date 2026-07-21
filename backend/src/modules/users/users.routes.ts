import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listPendingHandler, approveHandler } from './users.controller.js'

const PERMISSION = 'platform.users.approve'

export async function usersRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/users/pending',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listPendingHandler,
  )

  app.patch<{ Params: { userId: string } }>(
    '/api/admin/users/:userId/approve',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    approveHandler,
  )
}
