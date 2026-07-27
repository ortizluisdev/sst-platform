import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  listActiveHandler,
  listSuspendedHandler,
  listPendingActivationHandler,
  reactivateHandler,
  suspendHandler,
  resendInvitationHandler,
} from './users.controller.js'

const PERMISSION = 'platform.users.approve'

export async function usersRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/users/active',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listActiveHandler,
  )

  app.get(
    '/api/admin/users/suspended',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listSuspendedHandler,
  )

  app.get(
    '/api/admin/users/pending-activation',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listPendingActivationHandler,
  )

  app.patch<{ Params: { userId: string } }>(
    '/api/admin/users/:userId/reactivate',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    reactivateHandler,
  )

  app.patch<{ Params: { userId: string }; Body: { suspendReason: string } }>(
    '/api/admin/users/:userId/suspend',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    suspendHandler,
  )

  app.post<{ Params: { userId: string } }>(
    '/api/admin/users/:userId/resend-invitation',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    resendInvitationHandler,
  )
}
