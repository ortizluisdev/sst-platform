import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  saveBrandingHandler,
  getBrandingHandler,
  updateBrandingHandler,
  getLogoHandler,
  getOrganizationBrandingHandler,
  updateOrganizationBrandingHandler,
} from './organizationBranding.controller.js'

export async function organizationBrandingRoutes(app: FastifyInstance) {
  // Guardado inicial, solo aplica si la empresa todavía no tiene branding —
  // ver saveInitialBranding. Nunca se toca este endpoint para la edición
  // posterior, es exclusivo del flujo de activación.
  app.patch(
    '/api/dashboard/organization/branding',
    { preHandler: [requireAuth] },
    saveBrandingHandler,
  )

  // Lectura + edición deliberada posterior — pantalla de Configuración
  // general, siempre sobrescribe (sin la condición "if unset" de arriba).
  app.get('/api/dashboard/organization/branding', { preHandler: [requireAuth] }, getBrandingHandler)
  app.put('/api/dashboard/organization/branding', { preHandler: [requireAuth] }, updateBrandingHandler)

  // Admin — edita el branding de CUALQUIER empresa por id (distinto del
  // par de arriba, que siempre opera sobre "mi propia empresa"). Mismo
  // permiso que el resto de "Clientes" (organizations.routes.ts).
  app.get<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/branding',
    { preHandler: [requireAuth, requirePermission('platform.organizations.manage')] },
    getOrganizationBrandingHandler,
  )
  app.put<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId/branding',
    { preHandler: [requireAuth, requirePermission('platform.organizations.manage')] },
    updateOrganizationBrandingHandler,
  )

  // Público, sin requireAuth — ver comentario en getLogoHandler.
  app.get<{ Params: { organizationId: string } }>(
    '/api/organizations/:organizationId/logo',
    {},
    getLogoHandler,
  )
}
