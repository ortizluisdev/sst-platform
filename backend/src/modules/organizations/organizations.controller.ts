import type { FastifyReply, FastifyRequest } from 'fastify'
import { createOrganizationSchema, formatFieldErrors } from './organizations.schema.js'
import { createOrganizationsService, OrganizationsError } from './organizations.service.js'

export async function listServicesHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createOrganizationsService(request.server.prisma)
  const services = await service.listServices()
  return reply.code(200).send({ services })
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
      const status = err.code === 'SERVICE_NOT_FOUND' ? 404 : 409
      return reply.code(status).send({ message: err.message })
    }
    throw err
  }
}
