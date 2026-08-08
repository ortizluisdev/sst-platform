import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import { listPreferencesHandler, updatePreferenceHandler } from './notificationPreferences.controller.js'

/** Preferencias del usuario logueado sobre qué tipos de notificación recibe
 * y por qué canal — nunca por parámetro de otra cuenta, siempre la sesión. */
export async function notificationPreferencesRoutes(app: FastifyInstance) {
  app.get('/api/dashboard/notification-preferences', { preHandler: [requireAuth] }, listPreferencesHandler)

  app.patch<{ Params: { type: string } }>(
    '/api/dashboard/notification-preferences/:type',
    { preHandler: [requireAuth] },
    updatePreferenceHandler,
  )
}
