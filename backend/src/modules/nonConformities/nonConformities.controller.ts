import type { FastifyReply, FastifyRequest } from 'fastify'
import { createNonConformitiesService, NonConformitiesError } from './nonConformities.service.js'
import { createNonConformitySchema, updateNonConformitySchema, formatFieldErrors } from './nonConformities.schema.js'

function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof NonConformitiesError) {
    const status = err.code === 'NOT_FOUND' ? 404 : 404
    return reply.code(status).send({ message: err.message })
  }
  throw err
}

/** Resuelve la organización del usuario autenticado — misma simplificación
 * que el resto del dashboard cliente (primera membresía, ver variables.controller.ts). */
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

export async function clientListNonConformitiesHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  const service = createNonConformitiesService(request.server.prisma)
  try {
    const items = await service.list(organizationId, request.params.serviceSlug)
    return reply.code(200).send({ items })
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminListNonConformitiesHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const service = createNonConformitiesService(request.server.prisma)
  try {
    const items = await service.list(request.params.organizationId, request.params.serviceSlug)
    return reply.code(200).send({ items })
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminCreateNonConformityHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = createNonConformitySchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createNonConformitiesService(request.server.prisma)
  try {
    const created = await service.createManual(
      request.params.organizationId,
      request.params.serviceSlug,
      request.user.sub,
      parsed.data,
    )
    return reply.code(201).send(created)
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminUpdateNonConformityHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string; id: string } }>,
  reply: FastifyReply,
) {
  const parsed = updateNonConformitySchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createNonConformitiesService(request.server.prisma)
  try {
    await service.update(request.params.organizationId, request.params.id, parsed.data)
    return reply.code(204).send()
  } catch (err) {
    return sendError(reply, err)
  }
}
