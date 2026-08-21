import type { FastifyReply, FastifyRequest } from 'fastify'
import { createOrganizationSchema, updateOrganizationSchema, updateOrganizationServicesSchema, formatFieldErrors } from './organizations.schema.js'
import { createOrganizationsService, OrganizationsError } from './organizations.service.js'

function statusForError(code: OrganizationsError['code']): number {
  return code === 'SERVICE_NOT_FOUND' || code === 'NOT_FOUND' ? 404 : 409
}

function isTrue(value: unknown): boolean {
  return value === 'true'
}

export async function createOrganizationHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createOrganizationSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createOrganizationsService(request.server.prisma)
  try {
    const { organization, responsable } = await service.create(parsed.data, request.user.sub, request.ip)
    return reply.code(201).send({
      organization: { id: organization.id, nombre: organization.nombre, nit: organization.nit },
      responsable: { id: responsable.id, documentNumber: responsable.documentNumber, nombre: responsable.nombre },
    })
  } catch (err) {
    if (err instanceof OrganizationsError) {
      return reply.code(statusForError(err.code)).send({ message: err.message })
    }
    throw err
  }
}

export async function listOrganizationsFullHandler(
  request: FastifyRequest<{ Querystring: { deletedOnly?: string } }>,
  reply: FastifyReply,
) {
  const service = createOrganizationsService(request.server.prisma)
  const organizations = await service.list({ deletedOnly: isTrue(request.query.deletedOnly) })
  return reply.code(200).send({ organizations })
}

export async function updateOrganizationHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateOrganizationSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationsService(request.server.prisma)
  try {
    const organization = await service.update(organizationId, parsed.data, request.user.sub, request.ip)
    return reply.code(200).send({ organization })
  } catch (err) {
    if (err instanceof OrganizationsError) {
      return reply.code(statusForError(err.code)).send({ message: err.message })
    }
    throw err
  }
}

export async function updateOrganizationServicesHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateOrganizationServicesSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { organizationId } = request.params as { organizationId: string }
  const service = createOrganizationsService(request.server.prisma)
  try {
    await service.updateServices(organizationId, parsed.data, request.user.sub, request.ip)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrganizationsError) {
      return reply.code(statusForError(err.code)).send({ message: err.message })
    }
    throw err
  }
}

export async function deleteOrganizationHandler(
  request: FastifyRequest<{ Params: { organizationId: string } }>,
  reply: FastifyReply,
) {
  const service = createOrganizationsService(request.server.prisma)
  try {
    await service.remove(request.params.organizationId, request.user.sub, request.ip)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrganizationsError) {
      return reply.code(statusForError(err.code)).send({ message: err.message })
    }
    throw err
  }
}

export async function restoreOrganizationHandler(
  request: FastifyRequest<{ Params: { organizationId: string } }>,
  reply: FastifyReply,
) {
  const service = createOrganizationsService(request.server.prisma)
  try {
    await service.restore(request.params.organizationId, request.user.sub, request.ip)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrganizationsError) {
      return reply.code(statusForError(err.code)).send({ message: err.message })
    }
    throw err
  }
}
