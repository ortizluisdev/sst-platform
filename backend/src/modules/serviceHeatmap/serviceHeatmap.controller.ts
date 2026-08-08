import type { FastifyReply, FastifyRequest } from 'fastify'
import { createServiceHeatmapService, ServiceHeatmapError } from './serviceHeatmap.service.js'
import { saveHeatmapSchema, formatFieldErrors } from './serviceHeatmap.schema.js'

function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof ServiceHeatmapError) return reply.code(404).send({ message: err.message })
  throw err
}

/** Resuelve la organización del usuario autenticado — misma simplificación
 * que el resto del dashboard cliente (primera membresía). */
async function resolveClientOrganizationId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const membership = await request.server.prisma.userOrganization.findFirst({
    where: { userId: request.user.sub },
    select: { organizationId: true },
  })
  if (!membership) {
    reply.code(403).send({ message: 'No perteneces a ninguna organización' })
    return null
  }
  return membership.organizationId
}

export async function clientGetHeatmapHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  const service = createServiceHeatmapService(request.server.prisma)
  try {
    const images = await service.getImages(organizationId, request.params.serviceSlug)
    return reply.code(200).send({ images })
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminGetHeatmapHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const service = createServiceHeatmapService(request.server.prisma)
  try {
    const images = await service.getImages(request.params.organizationId, request.params.serviceSlug)
    return reply.code(200).send({ images })
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminSaveHeatmapHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = saveHeatmapSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createServiceHeatmapService(request.server.prisma)
  try {
    await service.saveImage(request.params.organizationId, request.params.serviceSlug, request.user.sub, parsed.data)
    return reply.code(200).send({ applied: true })
  } catch (err) {
    return sendError(reply, err)
  }
}
