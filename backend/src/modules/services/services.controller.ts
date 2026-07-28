import type { FastifyReply, FastifyRequest } from 'fastify'
import { createServiceSchema, updateServiceSchema, formatFieldErrors } from './services.schema.js'
import { createServicesService, ServicesError } from './services.service.js'

export async function listServicesHandler(request: FastifyRequest, reply: FastifyReply) {
  const includeInactive = (request.query as { includeInactive?: string }).includeInactive === 'true'
  const service = createServicesService(request.server.prisma)
  const services = await service.list(includeInactive)
  return reply.code(200).send({ services })
}

export async function createServiceHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createServiceSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createServicesService(request.server.prisma)
  const created = await service.create(parsed.data, request.user.sub, request.ip)
  return reply.code(201).send({ service: created })
}

export async function updateServiceHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateServiceSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { serviceId } = request.params as { serviceId: string }
  const service = createServicesService(request.server.prisma)
  try {
    const updated = await service.update(serviceId, parsed.data, request.user.sub, request.ip)
    return reply.code(200).send({ service: updated })
  } catch (err) {
    if (err instanceof ServicesError) return reply.code(404).send({ message: err.message })
    throw err
  }
}
