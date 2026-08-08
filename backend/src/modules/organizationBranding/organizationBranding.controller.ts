import { createHash } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { saveBrandingSchema, formatFieldErrors } from './organizationBranding.schema.js'
import { createOrganizationBrandingService, OrganizationBrandingError } from './organizationBranding.service.js'

export async function saveBrandingHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = saveBrandingSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createOrganizationBrandingService(request.server.prisma)
  try {
    const { applied } = await service.saveInitialBranding(request.user.sub, parsed.data)
    return reply.code(200).send({ applied })
  } catch (err) {
    if (err instanceof OrganizationBrandingError) return reply.code(403).send({ message: err.message })
    throw err
  }
}

/** Lee el branding actual de la empresa del usuario logueado — para
 * precargar el formulario de edición en Configuración general. */
export async function getBrandingHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createOrganizationBrandingService(request.server.prisma)
  try {
    const branding = await service.getBrandingForUser(request.user.sub)
    return reply.code(200).send(branding)
  } catch (err) {
    if (err instanceof OrganizationBrandingError) return reply.code(403).send({ message: err.message })
    throw err
  }
}

/** Edición deliberada posterior a la activación — siempre sobrescribe, a
 * diferencia de saveBrandingHandler (que solo aplica la primera vez). */
export async function updateBrandingHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = saveBrandingSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createOrganizationBrandingService(request.server.prisma)
  try {
    await service.updateBrandingForUser(request.user.sub, parsed.data)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrganizationBrandingError) return reply.code(403).send({ message: err.message })
    throw err
  }
}

/** Público — sin requireAuth. Un logo de empresa no es dato sensible, y el
 * navegador debe poder cargarlo vía <img src> aunque frontend/backend vivan
 * en dominios distintos en producción (ahí una cookie SameSite=Lax no viaja
 * en una petición de subrecurso entre sitios). Ver spec de branding. */
export async function getLogoHandler(request: FastifyRequest, reply: FastifyReply) {
  // @fastify/helmet's default Cross-Origin-Resource-Policy: same-origin
  // blocks this response from loading in a cross-origin <img src> (the
  // browser enforces CORP independently of auth — being "public" doesn't
  // exempt it). Set unconditionally, before any early return, so it applies
  // to the 404 paths too — a client with no logo yet must still resolve to
  // the <img>'s @error fallback via a clean CORS-safe 404, not a blocked
  // request. This route is the one deliberate exception: overriding it here,
  // not globally, keeps Helmet's default protecting the rest of the
  // (auth-gated, non-image) API surface.
  reply.header('Cross-Origin-Resource-Policy', 'cross-origin')

  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationBrandingService(request.server.prisma)
  const logoBase64 = await service.getLogoForOrganization(organizationId)
  if (!logoBase64) return reply.code(404).send()

  const match = logoBase64.match(/^data:(image\/(?:png|svg\+xml));base64,(.+)$/)
  if (!match) return reply.code(404).send()

  const [, contentType, payload] = match
  const buffer = Buffer.from(payload, 'base64')
  return reply
    .code(200)
    .header('Content-Type', contentType)
    .header('Cache-Control', 'public, max-age=86400')
    .header('ETag', `"${createHash('sha256').update(buffer).digest('hex').slice(0, 16)}"`)
    .send(buffer)
}
