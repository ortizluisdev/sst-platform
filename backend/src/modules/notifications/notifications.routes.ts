import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  listHandler,
  unreadCountHandler,
  detailHandler,
  markReadHandler,
  markAllReadHandler,
  adminListHandler,
  createNotificationHandler,
  updateNotificationHandler,
  deleteNotificationHandler,
} from './notifications.controller.js'

const MANAGE_PERMISSION = 'platform.notifications.manage'

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

  // CRUD admin — redactar/editar/eliminar (borrado suave) notificaciones de
  // cualquier destinatario. Separado de las rutas de arriba (que siempre
  // operan sobre la sesión actual) para no mezclar IDOR-safety con
  // permiso-de-plataforma en el mismo handler.
  app.get('/api/admin/notifications', { preHandler: [requireAuth, requirePermission(MANAGE_PERMISSION)] }, adminListHandler)
  app.post(
    '/api/admin/notifications',
    { preHandler: [requireAuth, requirePermission(MANAGE_PERMISSION)] },
    createNotificationHandler,
  )
  app.patch<{ Params: { notificationId: string } }>(
    '/api/admin/notifications/:notificationId',
    { preHandler: [requireAuth, requirePermission(MANAGE_PERMISSION)] },
    updateNotificationHandler,
  )
  app.delete<{ Params: { notificationId: string } }>(
    '/api/admin/notifications/:notificationId',
    { preHandler: [requireAuth, requirePermission(MANAGE_PERMISSION)] },
    deleteNotificationHandler,
  )
}
