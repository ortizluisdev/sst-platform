import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import {
  createOrganizationHandler,
  listOrganizationsFullHandler,
  updateOrganizationHandler,
} from './organizations.controller.js'

const PERMISSION = 'platform.organizations.manage'

export async function organizationsRoutes(app: FastifyInstance) {
  // Nota: no se puede usar GET /api/admin/organizations (sin sufijo) — esa
  // ruta ya existe en variables.routes.ts (listado filtrado por servicio
  // para el selector de "Operación"), y Fastify no permite dos handlers en
  // el mismo método+path exacto.
  app.get(
    '/api/admin/organizations/full',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listOrganizationsFullHandler,
  )

  app.post(
    '/api/admin/organizations',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    createOrganizationHandler,
  )

  app.patch<{ Params: { organizationId: string } }>(
    '/api/admin/organizations/:organizationId',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateOrganizationHandler,
  )
}
