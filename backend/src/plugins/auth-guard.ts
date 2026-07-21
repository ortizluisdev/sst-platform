import type { FastifyReply, FastifyRequest } from 'fastify'
import { hasPermission, resolveUserPermissions } from '../utils/permissions.js'

/**
 * preHandler para rutas protegidas: exige un access token válido (JWT firmado,
 * leído de la cookie httpOnly `roma_access_token`). En éxito, decora
 * `request.user` con { sub } (el id de usuario) — las rutas de dashboard lo
 * usan junto con utils/permissions.ts para derivar organization_id/service_id
 * y permisos reales de la sesión, nunca de un parámetro que venga del frontend.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ message: 'No autenticado' })
  }
}

/**
 * Fábrica de preHandler para exigir un permiso específico — así es como un
 * controlador real revisa permisos, ej.:
 *
 *   app.post('/api/announcements', {
 *     preHandler: [requireAuth, requirePermission('landing.anuncios.manage')],
 *   }, createAnnouncementHandler)
 *
 * Debe ir DESPUÉS de requireAuth en la lista de preHandlers (necesita
 * request.user, que requireAuth decora vía jwtVerify). Si se pasa
 * `organizationId`, junta también los permisos del rol del usuario dentro de
 * esa organización — pásalo cuando la ruta sea de un recurso específico de
 * una organización (ej. :organizationId en el path).
 */
export function requirePermission(key: string, getOrganizationId?: (request: FastifyRequest) => string | undefined) {
  return async function requirePermissionHandler(request: FastifyRequest, reply: FastifyReply) {
    const organizationId = getOrganizationId?.(request)
    const permissions = await resolveUserPermissions(request.server.prisma, request.user.sub, organizationId)
    if (!hasPermission(permissions, key)) {
      return reply.code(403).send({ message: 'No tienes permiso para realizar esta acción' })
    }
  }
}
