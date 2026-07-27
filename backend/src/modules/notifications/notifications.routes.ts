import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import { listHandler, unreadCountHandler, detailHandler, markReadHandler, markAllReadHandler } from './notifications.controller.js'

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/api/notifications', { preHandler: requireAuth }, listHandler)
  app.get('/api/notifications/unread-count', { preHandler: requireAuth }, unreadCountHandler)
  app.get<{ Params: { notificationId: string } }>(
    '/api/notifications/:notificationId',
    { preHandler: requireAuth },
    detailHandler,
  )
  app.patch<{ Params: { notificationId: string } }>(
    '/api/notifications/:notificationId/read',
    { preHandler: requireAuth },
    markReadHandler,
  )
  app.post('/api/notifications/read-all', { preHandler: requireAuth }, markAllReadHandler)
}
