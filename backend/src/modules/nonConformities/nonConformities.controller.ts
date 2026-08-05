import type { FastifyReply, FastifyRequest } from 'fastify'
import { createNonConformitiesService, NonConformitiesError } from './nonConformities.service.js'
import {
  createNonConformitySchema,
  updateNonConformitySchema,
  listNonConformitiesQuerySchema,
  formatFieldErrors,
} from './nonConformities.schema.js'

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

/** Paginado — alimenta tanto la pestaña dedicada (paginación completa) como
 * el resumen recortado de Hoja 1 · Dashboard (pageSize chico desde el
 * frontend). Reemplaza al listado sin paginar que tenía antes: cualquier
 * llamador que no mande page/pageSize recibe los defaults del schema
 * (page=1, pageSize=20), así que sigue funcionando sin romper nada. */
export async function adminListNonConformitiesHandler(
  request: FastifyRequest<{
    Params: { organizationId: string; serviceSlug: string }
    Querystring: unknown
  }>,
  reply: FastifyReply,
) {
  const parsed = listNonConformitiesQuerySchema.safeParse(request.query)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createNonConformitiesService(request.server.prisma)
  try {
    const result = await service.listPaginated(request.params.organizationId, request.params.serviceSlug, parsed.data)
    return reply.code(200).send(result)
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

/** Borrado suave — ver comentario de `deletedAt` en schema.prisma, nunca
 * elimina la fila realmente. */
export async function adminDeleteNonConformityHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string; id: string } }>,
  reply: FastifyReply,
) {
  const service = createNonConformitiesService(request.server.prisma)
  try {
    await service.remove(request.params.organizationId, request.params.id)
    return reply.code(204).send()
  } catch (err) {
    return sendError(reply, err)
  }
}
