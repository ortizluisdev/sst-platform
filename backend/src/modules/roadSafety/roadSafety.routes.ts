import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  adminUploadHandler,
  clientUploadHandler,
  uploadHistoryHandlers,
  hoja1Handlers,
  hoja2Handlers,
  hoja3Handlers,
  hoja4Handlers,
  alertasHandlers,
} from './roadSafety.controller.js'

/** Mismos permisos que Higiene Industrial (platform.variables.upload /
 * platform.dashboards.view) — Seguridad Vial es un servicio más, no
 * necesita permisos nuevos. */
export async function roadSafetyRoutes(app: FastifyInstance) {
  app.post<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/road-safety/upload',
    { preHandler: [requireAuth, requirePermission('platform.variables.upload')] },
    adminUploadHandler,
  )
  // Mismo criterio que variables.routes.ts: las rutas CLIENTE solo piden
  // requireAuth (el acceso queda acotado por su propia organización, ya
  // resuelta de la sesión) — platform.dashboards.view es exclusivo de las
  // rutas ADMIN (cualquier organización por parámetro).
  app.post('/api/road-safety/upload', { preHandler: [requireAuth] }, clientUploadHandler)

  app.get<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/road-safety/uploads',
    { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
    uploadHistoryHandlers.admin,
  )
  app.get('/api/road-safety/uploads', { preHandler: [requireAuth] }, uploadHistoryHandlers.client)

  for (const [sheet, handlers] of Object.entries({
    hoja1: hoja1Handlers,
    hoja2: hoja2Handlers,
    hoja3: hoja3Handlers,
    hoja4: hoja4Handlers,
    alertas: alertasHandlers,
  })) {
    app.get<{ Params: { organizationId: string } }>(
      `/api/admin/organizations/:organizationId/road-safety/${sheet}`,
      { preHandler: [requireAuth, requirePermission('platform.dashboards.view')] },
      handlers.admin,
    )
    app.get(`/api/road-safety/${sheet}`, { preHandler: [requireAuth] }, handlers.client)
  }
}
