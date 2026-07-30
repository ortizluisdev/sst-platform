import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import { saveBrandingHandler, getLogoHandler } from './organizationBranding.controller.js'

export async function organizationBrandingRoutes(app: FastifyInstance) {
  app.patch(
    '/api/dashboard/organization/branding',
    { preHandler: [requireAuth] },
    saveBrandingHandler,
  )

  // Público, sin requireAuth — ver comentario en getLogoHandler.
  app.get<{ Params: { organizationId: string } }>(
    '/api/organizations/:organizationId/logo',
    {},
    getLogoHandler,
  )
}
