import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listCatalogHandler, createCatalogItemHandler, updateCatalogItemHandler } from './orgCatalogs.controller.js'

const PERMISSION = 'platform.workCatalogs.manage'

/** Zona/Sección/Cargo/Trabajador por organización — catálogos que el admin
 * gestiona por empresa y que se exigen al subir variables (ver
 * variables.controller.ts), porque el Excel de carga no los trae. */
export async function orgCatalogsRoutes(app: FastifyInstance) {
  app.get<{ Params: { organizationId: string; tipo: string } }>(
    '/api/admin/organizations/:organizationId/catalogs/:tipo',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listCatalogHandler,
  )

  app.post<{ Params: { organizationId: string; tipo: string } }>(
    '/api/admin/organizations/:organizationId/catalogs/:tipo',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    createCatalogItemHandler,
  )

  app.patch<{ Params: { organizationId: string; tipo: string; itemId: string } }>(
    '/api/admin/organizations/:organizationId/catalogs/:tipo/:itemId',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateCatalogItemHandler,
  )
}
