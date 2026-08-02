import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  catalogParamsSchema,
  catalogItemParamsSchema,
  createCatalogItemSchema,
  updateCatalogItemSchema,
  formatFieldErrors,
} from './orgCatalogs.schema.js'
import { createOrgCatalogsService, OrgCatalogsError } from './orgCatalogs.service.js'

function statusForError(code: OrgCatalogsError['code']): number {
  return code === 'ORG_NOT_FOUND' || code === 'ITEM_NOT_FOUND' ? 404 : 409
}

export async function listCatalogHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = catalogParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createOrgCatalogsService(request.server.prisma)
  try {
    const items = await service.list(parsed.data.tipo, parsed.data.organizationId)
    return reply.code(200).send({ items })
  } catch (err) {
    if (err instanceof OrgCatalogsError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}

export async function createCatalogItemHandler(request: FastifyRequest, reply: FastifyReply) {
  const paramsParsed = catalogParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

  const bodyParsed = createCatalogItemSchema.safeParse(request.body)
  if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

  const service = createOrgCatalogsService(request.server.prisma)
  try {
    const item = await service.create(paramsParsed.data.tipo, paramsParsed.data.organizationId, bodyParsed.data)
    return reply.code(201).send({ item })
  } catch (err) {
    if (err instanceof OrgCatalogsError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}

export async function updateCatalogItemHandler(request: FastifyRequest, reply: FastifyReply) {
  const paramsParsed = catalogItemParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

  const bodyParsed = updateCatalogItemSchema.safeParse(request.body)
  if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

  const service = createOrgCatalogsService(request.server.prisma)
  try {
    await service.update(
      paramsParsed.data.tipo,
      paramsParsed.data.itemId,
      paramsParsed.data.organizationId,
      bodyParsed.data,
    )
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrgCatalogsError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}
