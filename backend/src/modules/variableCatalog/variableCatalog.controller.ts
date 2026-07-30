import type { FastifyReply, FastifyRequest } from 'fastify'
import { updateVariableDefinitionSchema, formatFieldErrors } from './variableCatalog.schema.js'
import { createVariableCatalogService, VariableCatalogError } from './variableCatalog.service.js'

function statusForError(code: VariableCatalogError['code']): number {
  return code === 'SERVICE_NOT_FOUND' || code === 'VARIABLE_NOT_FOUND' ? 404 : 409
}

export async function listVariableCatalogHandler(request: FastifyRequest, reply: FastifyReply) {
  const { serviceSlug } = request.params as { serviceSlug: string }
  const service = createVariableCatalogService(request.server.prisma)
  try {
    const categories = await service.listByService(serviceSlug)
    return reply.code(200).send({ categories })
  } catch (err) {
    if (err instanceof VariableCatalogError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}

export async function updateVariableCatalogHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateVariableDefinitionSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { variableId } = request.params as { variableId: string }
  const service = createVariableCatalogService(request.server.prisma)
  try {
    const variable = await service.update(variableId, parsed.data, request.user.sub, request.ip)
    return reply.code(200).send({ variable })
  } catch (err) {
    if (err instanceof VariableCatalogError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}
